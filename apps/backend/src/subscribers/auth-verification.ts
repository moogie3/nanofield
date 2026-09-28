import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyCustomer } from "../api/admin/shopee-imports/notify"

// Customer email verification (emailpass): Medusa emits this event with a
// single-use code whenever requestVerificationWorkflow runs — on register,
// on unverified login, and on explicit resend. We mail the code as a
// verify-account link through the active email provider (Mailtrap in dev,
// Resend in production). Never throws: a failed email must not break auth.
export default async function authVerificationHandler({
  event,
  container,
}: SubscriberArgs<{
  entity_id: string
  entity_type: string
  code: string
  auth_identity_id: string
}>) {
  const { data } = event as unknown as {
    data: {
      entity_id?: string
      entity_type?: string
      code?: string
    }
  }
  if (data.entity_type !== "email" || !data.entity_id || !data.code) {
    return
  }
  const base = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(
    /\/$/,
    ""
  )
  // Country prefix is cosmetic here (token confirm is country-independent);
  // "id" matches the storefront default region.
  const verifyUrl = `${base}/id/verify-account?token=${encodeURIComponent(data.code)}`
  try {
    const logger = container.resolve(
      ContainerRegistrationKeys.LOGGER
    ) as unknown as {
      info: (...args: unknown[]) => void
    }
    logger.info(`[auth-verification] sending verification email to ${data.entity_id}`)
  } catch {
    // logger unreachable — the email below still carries the flow
  }
  await notifyCustomer(container, {
    to: data.entity_id,
    template: "nanofield-email-verification",
    data: { verifyUrl },
  })
}

export const config: SubscriberConfig = {
  event: ["auth.verification_requested"],
}
