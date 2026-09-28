import { authenticate, defineMiddlewares } from "@medusajs/framework/http"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { NextFunction } from "express"
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

// Banner image upload (single `image` file, 5MB cap enforced in the route).
// JSON posts pass through untouched — multer only parses multipart bodies.
const bannerImage = upload.single("image")

// Audit capture: one row per admin mutation, written AFTER the response
// leaves (res finish hook) so the request path pays ~0ms. Fire-and-forget
// with a catch — logging must never break the operation it records.
// Only authenticated admin (user) mutations: POST/PATCH/PUT/DELETE.
// Never GET (volume), never /admin/auth* (login noise), never the audit
// API itself (self-logging loop), never request bodies (secrets).
const AUDIT_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"])

const auditCapture = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: NextFunction
) => {
  if (!AUDIT_METHODS.has(req.method)) {
    next()
    return
  }
  const rawPath =
    (req as unknown as { originalUrl?: string }).originalUrl ||
    req.path ||
    ""
  // Strip query string: audit the endpoint, never the parameters.
  const path = rawPath.split("?")[0]
  if (
    path.startsWith("/admin/auth") ||
    path.startsWith("/admin/audit-logs")
  ) {
    next()
    return
  }
  res.on("finish", () => {
    try {
      const auth = (
        req as unknown as {
          auth_context?: { actor_id?: string; actor_type?: string }
        }
      ).auth_context
      if (!auth?.actor_id || auth.actor_type !== "user") {
        return
      }
      const scope = req.scope
      const resolve = scope.resolve as unknown as (
        key: string
      ) => {
        createAuditEntries: (
          data: Record<string, unknown>
        ) => Promise<unknown>
      } | null
      let service: {
        createAuditEntries: (data: Record<string, unknown>) => Promise<unknown>
      } | null = null
      for (const key of ["audit_log", "auditLogModuleService"]) {
        try {
          const candidate = resolve(key)
          if (
            candidate &&
            typeof candidate.createAuditEntries === "function"
          ) {
            service = candidate as {
              createAuditEntries: (
                data: Record<string, unknown>
              ) => Promise<unknown>
            }
            break
          }
        } catch {
          // try the next key
        }
      }
      if (!service) {
        return
      }
      const record = {
        actor_id: auth.actor_id,
        method: req.method,
        path: path.slice(0, 500),
        status: res.statusCode,
      }
      // Resolve the actor email in the background (display only — the row
      // is complete without it). Never throws, never blocks.
      void Promise.resolve()
        .then(async () => {
          try {
            const query = scope.resolve(
              ContainerRegistrationKeys.QUERY
            ) as unknown as {
              graph: (args: unknown) => Promise<{ data?: { email?: string }[] }>
            }
            const { data } = await query.graph({
              entity: "user",
              fields: ["id", "email"],
              filters: { id: auth.actor_id },
            })
            const email = data?.[0]?.email
            await service!.createAuditEntries({
              ...record,
              ...(email ? { actor_email: email } : {}),
            })
          } catch {
            await service!.createAuditEntries(record).catch(() => {})
          }
        })
        .catch(() => {})
    } catch {
      // logging failed — the admin operation already succeeded
    }
  })
  next()
}

export default defineMiddlewares({
  routes: [
    { matcher: "/admin/shopee-imports/preview", middlewares: [shopeeFiles] },
    { matcher: "/admin/shopee-imports/execute", middlewares: [shopeeFiles] },
    // Customer notification bell: logged-in customers only (401 otherwise).
    {
      matcher: "/store/notifications",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    { matcher: "/admin/banners", middlewares: [bannerImage] },
    // Audit log capture across all admin routes (mutations only — see
    // auditCapture). Auth context is read at res-finish, after the whole
    // chain ran, so middleware ordering does not matter.
    { matcher: "/admin*", middlewares: [auditCapture] },
  ],
})
