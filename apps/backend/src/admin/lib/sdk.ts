import Medusa from "@medusajs/js-sdk"

// Shared client for admin customizations (widgets, routes). Session auth
// reuses the dashboard login cookie; relative base URL works in every env
// because the admin is served from the backend itself.
export const sdk = new Medusa({
  baseUrl: "/",
  auth: { type: "session" },
})
