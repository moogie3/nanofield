import {
  loadEnv,
  defineConfig,
  ContainerRegistrationKeys,
  Modules,
} from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Brand script for auth pages without a widget outlet. The invite-accept
// page (/app/invite) renders no injection zone (only login.before/after
// exist), so the branding widgets never mount there and it keeps the stock
// "Welcome to Medusa" copy. This inline head script runs on every admin
// page but only acts on /app/invite*, swapping the logo, headings, and
// title to Nanofield. Mirrors src/admin/lib/brand-dom.ts (kept separate:
// medusa-config runs in node and must stay dependency-free).
const NANOFIELD_AUTH_SCRIPT = [
  ';(function () {',
  '  var AVATAR = \'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none"><circle cx="15" cy="23" r="8.5" fill="#2B8DC4"/><circle cx="26" cy="23" r="8.5" fill="#E6654F"/><circle cx="36" cy="21" r="9" fill="#2C8869"/><circle cx="38" cy="14" r="5.5" fill="#2C8869"/></svg>\'',
  '  var COPY = {',
  '    "Welcome to Medusa": "Welcome to Nanofield",',
  '    "Create your account below": "Create your Nanofield account below"',
  '  }',
  '  function onInvitePage() {',
  '    return window.location.pathname.indexOf("/app/invite") === 0',
  '  }',
  '  function swapLogos() {',
  '    var svgs = document.querySelectorAll(\'svg[viewBox="0 0 400 400"], svg[viewBox="0 0 36 38"]\')',
  '    for (var i = 0; i < svgs.length; i++) {',
  '      var svg = svgs[i]',
  '      if (svg.hasAttribute("data-nanofield-avatar")) continue',
  '      var tpl = document.createElement("template")',
  '      tpl.innerHTML = AVATAR',
  '      var node = tpl.content.firstElementChild',
  '      if (!node) continue',
  '      node.setAttribute("data-nanofield-avatar", "true")',
  '      svg.replaceWith(node)',
  '    }',
  '  }',
  '  function swapCopy() {',
  '    var walker = document.createTreeWalker(document.body, 4)',
  '    var nodes = []',
  '    var n',
  '    while ((n = walker.nextNode())) nodes.push(n)',
  '    for (var i = 0; i < nodes.length; i++) {',
  '      var t = nodes[i]',
  '      var text = (t.textContent || "").trim()',
  '      var rep = COPY[text]',
  '      if (rep && t.parentElement && t.parentElement.tagName !== "SCRIPT" && t.parentElement.tagName !== "STYLE") {',
  '        t.textContent = (t.textContent || "").replace(text, rep)',
  '      }',
  '    }',
  '  }',
  '  function swapTitle() {',
  '    var el = document.querySelector("title")',
  '    if (el && /medusa/i.test(el.textContent || "")) {',
  '      el.textContent = (el.textContent || "").replace(/medusa/gi, "Nanofield")',
  '    }',
  '  }',
  '  function sweep() {',
  '    if (!onInvitePage()) return',
  '    swapLogos()',
  '    swapCopy()',
  '    swapTitle()',
  '  }',
  '  function boot() {',
  '    sweep()',
  '    new MutationObserver(sweep).observe(document.documentElement, { childList: true, subtree: true, characterData: true })',
  '  }',
  '  if (document.readyState === "loading") {',
  '    document.addEventListener("DOMContentLoaded", boot)',
  '  } else {',
  '    boot()',
  '  }',
  '})()',
].join('\n')

module.exports = defineConfig({
  admin: {
    path: '/app',
    // Inject the auth-page brand script into the admin shell (dev + build).
    // transformIndexHtml runs for every admin page, including /app/invite.
    // Return ONLY the additions: the bundler mergeConfigs our return value
    // onto the base config, so spreading the base plugins here would
    // register every base plugin (including react-refresh) twice.
    vite: () => ({
      plugins: [
        {
          name: 'nanofield-brand-head',
          transformIndexHtml: (html: string) =>
            html.replace(
              '</head>',
              `<script>${NANOFIELD_AUTH_SCRIPT}</script></head>`
            ),
        },
      ],
    }),
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
      // Customer email verification (emailpass): login/register returns
      // verification_required until the customer confirms via the
      // verify-account page. The verification email itself is sent by the
      // auth-verification subscriber through Resend/Mailtrap.
      authVerificationsPerActor: {
        customer: [{ entity_type: "email", auth_provider: "emailpass" }],
      },
    }
  },
  modules: [
    // RBAC engine (policies, roles, user↔role links). Required when
    // MEDUSA_FF_RBAC=true — the flag alone only gates routes, the module
    // itself is NOT auto-loaded. Without this, every query.graph on
    // rbac_* entities fails with Service alias not found and all guarded
    // admin routes 403.
    {
      key: "rbac",
      resolve: "@medusajs/medusa/rbac",
    },
    {
      resolve: "./src/modules/rajaongkir",
    },
    {
      resolve: "./src/modules/banner",
    },
    {
      resolve: "./src/modules/sender-profile",
    },
    {
      // dependencies are forwarded from the global container into the
      // module's local container (register-modules resolution): query,
      // link, and rbac are used by AuditLogModuleService.bootstrapTiers in
      // onApplicationStart. NOTE: the Module() definition in index.ts can
      // NOT declare these — Module() only keeps service/loaders/linkable
      // and silently drops everything else. This entry is the only place
      // that works.
      resolve: "./src/modules/audit-log",
      dependencies: [
        ContainerRegistrationKeys.QUERY,
        ContainerRegistrationKeys.LINK,
        Modules.RBAC,
      ],
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
                    channels: ["email"],
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
                    channels: ["email"],
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
