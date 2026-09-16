import { authenticate, defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"

// Shopee xlsx uploads (Shopee caps templates at 5MB; base64/JSON is NOT
// used because the API body limit rejects multi-MB payloads).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 4 },
})

const shopeeFiles = upload.fields([
  { name: "sales", maxCount: 1 },
  { name: "basic", maxCount: 1 },
  { name: "media", maxCount: 1 },
  { name: "ship", maxCount: 1 },
])

export default defineMiddlewares({
  routes: [
    { matcher: "/admin/shopee-imports/preview", middlewares: [shopeeFiles] },
    { matcher: "/admin/shopee-imports/execute", middlewares: [shopeeFiles] },
    // Customer notification bell: logged-in customers only (401 otherwise).
    {
      matcher: "/store/notifications",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})
