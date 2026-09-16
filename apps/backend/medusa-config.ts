import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [
    {
      resolve: "./src/modules/rajaongkir",
    },
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "./src/modules/rajaongkir-fulfillment",
            id: "rajaongkir",
            options: {
              apiKey: process.env.RAJAONGKIR_API_KEY,
              baseUrl: process.env.RAJAONGKIR_BASE_URL,
              originId: process.env.RAJAONGKIR_ORIGIN_ID
                ? Number(process.env.RAJAONGKIR_ORIGIN_ID)
                : undefined,
              origin: process.env.RAJAONGKIR_ORIGIN,
              defaultWeightG: process.env.RAJAONGKIR_DEFAULT_WEIGHT_G
                ? Number(process.env.RAJAONGKIR_DEFAULT_WEIGHT_G)
                : undefined,
              fallbackAmount: process.env.RAJAONGKIR_FALLBACK_AMOUNT
                ? Number(process.env.RAJAONGKIR_FALLBACK_AMOUNT)
                : undefined,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/midtrans-payment",
            id: "midtrans",
            options: {
              serverKey: process.env.MIDTRANS_SERVER_KEY,
              clientKey: process.env.MIDTRANS_CLIENT_KEY,
              isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
              storefrontUrl: process.env.STOREFRONT_URL,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "notification-local",
            options: {
              name: "Local feed",
              channels: ["feed"],
            },
          },
          // Email providers: exactly one is ever active. Resend wins when
          // its key exists (production intent); otherwise Mailtrap sandbox
          // catches everything in dev. Neither set → customer email calls
          // skip silently (notifyCustomer never throws).
          ...(process.env.RESEND_API_KEY
            ? [
                {
                  resolve: "./src/modules/resend-notification",
                  id: "resend",
                  options: {
                    apiKey: process.env.RESEND_API_KEY,
                    // Single-sender verification: must be exactly the
                    // verified address, otherwise Resend rejects the send.
                    from: process.env.RESEND_FROM,
                    storeName: process.env.STORE_NAME,
                    whatsapp: process.env.STORE_PHONE,
                    supportEmail: process.env.STORE_EMAIL,
                    address: process.env.STORE_ADDRESS_1,
                  },
                },
              ]
            : []),
          ...(process.env.MAILTRAP_USER && !process.env.RESEND_API_KEY
            ? [
                {
                  resolve: "./src/modules/mailtrap-notification",
                  id: "mailtrap",
                  options: {
                    host:
                      process.env.MAILTRAP_HOST ||
                      "sandbox.smtp.mailtrap.io",
                    port: Number(process.env.MAILTRAP_PORT) || 2525,
                    user: process.env.MAILTRAP_USER,
                    pass: process.env.MAILTRAP_PASS,
                    from: process.env.MAILTRAP_FROM,
                    storeName: process.env.STORE_NAME,
                    whatsapp: process.env.STORE_PHONE,
                    supportEmail: process.env.STORE_EMAIL,
                    address: process.env.STORE_ADDRESS_1,
                  },
                },
              ]
            : []),
        ],
      },
    },
  ],
})
