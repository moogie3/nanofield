import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  Logger,
  MedusaContainer,
  NotificationTypes,
} from "@medusajs/framework/types"
import { TEMPLATES } from "./templates"

type ResendModuleOptions = {
  apiKey?: string
  from?: string
  storeName?: string
  whatsapp?: string
  supportEmail?: string
  address?: string
}

type ResendSendResponse = {
  id?: string
  message?: string
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"

  protected logger_: Logger
  protected options_: ResendModuleOptions
  protected container_: MedusaContainer

  constructor(
    container: MedusaContainer & { logger: Logger },
    options?: ResendModuleOptions
  ) {
    super()
    this.container_ = container
    this.logger_ = container.logger
    this.options_ = options ?? {}
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.apiKey || typeof options.apiKey !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend provider: apiKey (RESEND_API_KEY) is required."
      )
    }
    if (!options.from || typeof options.from !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend provider: from (RESEND_FROM) is required — with " +
          "single-sender verification it must be exactly the verified address."
      )
    }
  }

  protected from_(): string {
    return this.options_.from ?? ""
  }

  protected contact_(): {
    whatsapp?: string
    email?: string
    address?: string
  } {
    return {
      ...(this.options_.whatsapp ? { whatsapp: this.options_.whatsapp } : {}),
      ...(this.options_.supportEmail
        ? { email: this.options_.supportEmail }
        : {}),
      ...(this.options_.address ? { address: this.options_.address } : {}),
    }
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    const renderer = TEMPLATES[notification.template]
    if (!renderer) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Resend provider: unknown template "${notification.template}".`
      )
    }
    if (!notification.to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend provider: no recipient (to)."
      )
    }
    const rendered = renderer({
      ...((notification.data as Record<string, unknown> | null) ?? {}),
      contact: {
        ...this.contact_(),
        ...(((notification.data as Record<string, unknown> | null)?.contact as Record<string, unknown>) ?? {}),
      },
    })
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options_.apiKey ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: notification.from || this.from_(),
        to: [notification.to],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
    })
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend send failed: HTTP ${res.status} ${await res.text()}`
      )
    }
    const json = (await res.json()) as ResendSendResponse
    if (typeof json.id === "string") {
      return { id: json.id }
    }
    return {}
  }
}

export default ResendNotificationProviderService
