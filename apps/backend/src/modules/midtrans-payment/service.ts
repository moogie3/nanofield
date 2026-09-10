import {
  AbstractPaymentProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  MedusaContainer,
  PaymentActions,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { createHash } from "crypto"
import midtransClient from "midtrans-client"

type MidtransModuleOptions = {
  serverKey?: string
  clientKey?: string
  isProduction?: boolean
  // Public storefront root, e.g. http://localhost:8000. Snap's finish
  // button returns here; the default region path matches
  // NEXT_PUBLIC_DEFAULT_REGION=id.
  storefrontUrl?: string
}

type SnapNotification = {
  order_id?: string
  status_code?: string
  gross_amount?: string
  signature_key?: string
  transaction_status?: string
  fraud_status?: string
  payment_type?: string
  [key: string]: unknown
}

const REQUEST_TIMEOUT_MS = 15000

// Midtrans transaction_status (+fraud_status) mapped once, used by the
// status reader, authorize, and the webhook. "captured" covers settlement,
// refunds included: money landed, disputes stay manual.
const mapStatus = (
  transactionStatus?: string,
  fraudStatus?: string
): { session: PaymentSessionStatus; action: PaymentActions } => {
  switch (transactionStatus) {
    case "capture":
      return fraudStatus === "challenge"
        ? { session: "requires_more", action: "requires_more" }
        : { session: "captured", action: "captured" }
    case "settlement":
      return { session: "captured", action: "captured" }
    case "pending":
      return { session: "pending", action: "pending" }
    case "deny":
      return { session: "error", action: "failed" }
    case "cancel":
    case "expire":
      return { session: "canceled", action: "canceled" }
    default:
      return { session: "pending", action: "pending" }
  }
}

class MidtransPaymentProviderService extends AbstractPaymentProvider<MidtransModuleOptions> {
  static identifier = "midtrans"

  protected logger_: Logger
  protected options_: MidtransModuleOptions
  protected container_: MedusaContainer

  constructor(
    container: MedusaContainer & { logger: Logger },
    options?: MidtransModuleOptions
  ) {
    super(container, options)
    this.container_ = container
    this.logger_ = container.logger
    this.options_ = options ?? {}
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.serverKey || typeof options.serverKey !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Midtrans provider: serverKey (MIDTRANS_SERVER_KEY) is required."
      )
    }
  }

  protected serverKey_(): string {
    return this.options_.serverKey ?? ""
  }

  protected snap_() {
    return new midtransClient.Snap({
      isProduction: this.options_.isProduction === true,
      serverKey: this.serverKey_(),
    })
  }

  protected core_() {
    return new midtransClient.CoreApi({
      isProduction: this.options_.isProduction === true,
      serverKey: this.serverKey_(),
    })
  }

  protected finishUrl_(): string {
    const root = (this.options_.storefrontUrl || "").replace(/\/$/, "")
    return `${root}/id/order/confirmed`
  }

  protected newOrderId(): string {
    return `nf-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`
  }

  protected async transactionStatus_(orderId: string) {
    return (await this.core_().transaction.status(orderId, {
      timeout: REQUEST_TIMEOUT_MS,
    })) as SnapNotification
  }

  protected isNotFound_(e: unknown): boolean {
    const err = e as { httpStatusCode?: unknown; message?: unknown }
    return (
      err?.httpStatusCode === 404 ||
      err?.httpStatusCode === "404" ||
      /Transaction doesn't exist|404/.test(String(err?.message ?? ""))
    )
  }

  // Sessions are matched to Midtrans order ids through the data stamped at
  // initiate time. The table stays small (only open sessions matter), so a
  // provider-scoped list with an in-code match is plenty.
  protected async findSessionId_(orderId: string): Promise<string | null> {
    const keys = ["payment", "paymentModuleService"]
    for (const key of keys) {
      try {
        const payment = (
          this.container_.resolve as unknown as (
            k: string
          ) => {
            listPaymentSessions: (
              filters?: Record<string, unknown>,
              config?: Record<string, unknown>
            ) => Promise<{ id: string; data?: Record<string, unknown> }[]>
          } | null
        )(key)
        if (!payment || typeof payment.listPaymentSessions !== "function") {
          continue
        }
        const sessions = await payment.listPaymentSessions(
          { provider_id: "pp_midtrans_midtrans" },
          { take: 500 }
        )
        const hit = (Array.isArray(sessions) ? sessions : []).find(
          (s) => s && (s.data as Record<string, unknown> | undefined)?.midtrans_order_id === orderId
        )
        if (hit) {
          return hit.id
        }
        return null
      } catch {
        // try the next key, fail loudly below
      }
    }
    return null
  }

  getIdentifier(): string {
    return MidtransPaymentProviderService.identifier
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    if (!this.serverKey_()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Midtrans provider is not configured (serverKey missing)."
      )
    }
    const amount = Math.round(Number(input.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Midtrans: invalid amount ${String(input.amount)}.`
      )
    }
    const orderId = this.newOrderId()
    const customer = input.context?.customer
    const txn = await this.snap_().createTransaction({
      transaction_details: { order_id: orderId, gross_amount: amount },
      credit_card: { secure: true },
      callbacks: { finish: this.finishUrl_() },
      ...(customer
        ? {
            customer_details: {
              ...(customer.first_name
                ? { first_name: customer.first_name }
                : {}),
              ...(customer.last_name
                ? { last_name: customer.last_name }
                : {}),
              ...(customer.email ? { email: customer.email } : {}),
              ...(customer.phone ? { phone: customer.phone } : {}),
            },
          }
        : {}),
    })
    return {
      id: orderId,
      status: "pending",
      data: {
        midtrans_order_id: orderId,
        midtrans_amount: amount,
        snap_token: (txn as { token?: string }).token,
        redirect_url: (txn as { redirect_url?: string }).redirect_url,
      },
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const prevAmount = Number(data.midtrans_amount)
    const nextAmount = Math.round(Number(input.amount))
    const orderId =
      typeof data.midtrans_order_id === "string"
        ? data.midtrans_order_id
        : null
    // Same amount: keep the Snap transaction, it is still payable.
    if (orderId && prevAmount === nextAmount) {
      return { data }
    }
    // Amount changed (cart edited after session init): retire the old
    // transaction and open a fresh one. Snap fixes gross_amount at create.
    if (orderId) {
      try {
        await this.core_().transaction.expire(orderId)
      } catch {
        // Already final (paid/expired): leave it, the new id supersedes it.
      }
    }
    const fresh = await this.initiatePayment({
      amount: input.amount,
      currency_code: input.currency_code,
      data,
      context: input.context,
    })
    return { data: fresh.data, status: "pending" }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const orderId =
      typeof data.midtrans_order_id === "string"
        ? data.midtrans_order_id
        : null
    if (orderId) {
      try {
        await this.core_().transaction.expire(orderId)
      } catch {
        // Best-effort cleanup; a paid/final transaction simply stays.
      }
    }
    return {}
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const orderId =
      typeof data.midtrans_order_id === "string"
        ? data.midtrans_order_id
        : null
    if (!orderId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Midtrans: no transaction to authorize (missing order id)."
      )
    }
    const st = await this.transactionStatus_(orderId).catch((e) => {
      // Unknown to Midtrans (propagation delay or abandoned create):
      // fail closed as pending — the cart cannot complete on this.
      if (this.isNotFound_(e)) {
        return null
      }
      throw e
    })
    if (!st) {
      return { status: "pending" as const, data }
    }
    const mapped = mapStatus(st.transaction_status, st.fraud_status)
    return {
      status:
        mapped.action === "captured" ? "authorized" : mapped.session,
      data: { ...data, midtrans_status: st.transaction_status },
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const orderId =
      typeof data.midtrans_order_id === "string"
        ? data.midtrans_order_id
        : null
    if (!orderId) {
      return {}
    }
    const st = await this.transactionStatus_(orderId).catch((e) => {
      if (this.isNotFound_(e)) {
        return null
      }
      throw e
    })
    if (!st) {
      return {}
    }
    // Snap auto-captures on settlement; only a challenged card needs approval.
    if (
      st.transaction_status === "capture" &&
      st.fraud_status === "challenge"
    ) {
      await this.core_().transaction.approve(orderId)
    }
    return {}
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const orderId =
      typeof data.midtrans_order_id === "string"
        ? data.midtrans_order_id
        : null
    if (!orderId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Midtrans: no transaction to refund (missing order id)."
      )
    }
    await this.core_().transaction.refund(orderId, {
      refund_key: `refund-${Date.now().toString(36)}`,
      amount: Math.round(Number(input.amount)),
      reason: "Nanofield refund from dashboard",
    })
    return {}
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const orderId =
      typeof data.midtrans_order_id === "string"
        ? data.midtrans_order_id
        : null
    if (!orderId) {
      return { data }
    }
    const st = await this.transactionStatus_(orderId)
    return { data: { ...data, midtrans_status: st } }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const orderId =
      typeof data.midtrans_order_id === "string"
        ? data.midtrans_order_id
        : null
    if (orderId) {
      try {
        await this.core_().transaction.expire(orderId)
      } catch {
        try {
          await this.core_().transaction.cancel(orderId)
        } catch {
          // Already final: nothing left to cancel.
        }
      }
    }
    return {}
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const orderId =
      typeof data.midtrans_order_id === "string"
        ? data.midtrans_order_id
        : null
    if (!orderId) {
      return { status: "pending", data }
    }
    const st = await this.transactionStatus_(orderId).catch((e) => {
      if (this.isNotFound_(e)) {
        return null
      }
      throw e
    })
    if (!st) {
      return { status: "pending", data }
    }
    return {
      status: mapStatus(st.transaction_status, st.fraud_status).session,
      data: { ...data, midtrans_status: st.transaction_status },
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const body = (
      (payload as { data?: unknown })?.data ?? payload
    ) as SnapNotification
    const orderId = typeof body?.order_id === "string" ? body.order_id : ""
    const expected = createHash("sha512")
      .update(
        `${body?.order_id ?? ""}${body?.status_code ?? ""}${body?.gross_amount ?? ""}${this.serverKey_()}`
      )
      .digest("hex")
    // An invalid signature is always rejected: never act on it.
    if (!orderId || body?.signature_key !== expected) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Midtrans webhook: invalid signature."
      )
    }
    const sessionId = await this.findSessionId_(orderId)
    if (!sessionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Midtrans webhook: no payment session for order ${orderId}.`
      )
    }
    const mapped = mapStatus(body.transaction_status, body.fraud_status)
    const amount = Number(body.gross_amount)
    return {
      action: mapped.action,
      data: {
        session_id: sessionId,
        amount: Number.isFinite(amount) ? amount : 0,
      },
    }
  }
}

export default MidtransPaymentProviderService
