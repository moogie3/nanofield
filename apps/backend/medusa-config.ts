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
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "./src/modules/rajaongkir-fulfillment",
            id: "rajaongkir",
            options: {
              apiKey: process.env.RAJAONGKIR_API_KEY,
              baseUrl: process.env.RAJAONGKIR_BASE_URL,
              origin: process.env.RAJAONGKIR_ORIGIN,
              couriers: process.env.RAJAONGKIR_COURIERS,
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
