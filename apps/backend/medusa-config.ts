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
        ],
      },
    },
  ],
})
