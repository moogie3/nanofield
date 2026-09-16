import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  Logger,
  MedusaContainer,
  NotificationTypes,
} from "@medusajs/framework/types"
import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import { TEMPLATES } from "../resend-notification/templates"

type MailtrapModuleOptions = {
  host?: string
  port?: number
  user?: string
  pass?: string
  from?: string
  storeName?: string
  whatsapp?: string
  supportEmail?: string
  address?: string
}

class MailtrapNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "mailtrap"

  protected logger_: Logger
  protected options_: MailtrapModuleOptions
  protected container_: MedusaContainer

  constructor(
    container: MedusaContainer & { logger: Logger },
    options?: MailtrapModuleOptions
  ) {
    super()
    this.container_ = container
    this.logger_ = container.logger
    this.options_ = options ?? {}
  }

  static validateOptions(options: Record<string, unknown>): void {
    for (const key of ["host", "user", "pass"] as const) {
      if (!options[key] || typeof options[key] !== "string") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Mailtrap provider: ${key} (MAILTRAP_${key.toUpperCase()}) is required — copy it from the sandbox inbox SMTP settings.`
        )
      }
    }
  }

  protected transporter_(): Transporter {
    // Created per send: dev volume is tiny and this avoids stale pooled
    // connections across hot reloads.
    return nodemailer.createTransport({
      host: this.options_.host,
      port: this.options_.port ?? 2525,
      auth: {
        user: this.options_.user ?? "",
        pass: this.options_.pass ?? "",
      },
    })
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
        `Mailtrap provider: unknown template "${notification.template}".`
      )
    }
    if (!notification.to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Mailtrap provider: no recipient (to)."
      )
    }
    const rendered = renderer({
      ...((notification.data as Record<string, unknown> | null) ?? {}),
      contact: {
        ...this.contact_(),
        ...(((notification.data as Record<string, unknown> | null)?.contact as Record<string, unknown>) ?? {}),
      },
    })
    const info = await this.transporter_().sendMail({
      from: notification.from || this.from_(),
      to: notification.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })
    return typeof info.messageId === "string" ? { id: info.messageId } : {}
  }
}

export default MailtrapNotificationProviderService
