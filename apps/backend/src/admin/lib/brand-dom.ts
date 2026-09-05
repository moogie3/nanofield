// Nanofield brand mark as inline SVG (sampled from the official lockup):
// blue #2B8DC4, orange #E6654F, green #2C8869.
export const NANOFIELD_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none"><circle cx="15" cy="23" r="8.5" fill="#2B8DC4"/><circle cx="26" cy="23" r="8.5" fill="#E6654F"/><circle cx="36" cy="21" r="9" fill="#2C8869"/><circle cx="38" cy="14" r="5.5" fill="#2C8869"/></svg>`

export const NANOFIELD_AVATAR_DATA_URI = `data:image/svg+xml,${encodeURIComponent(
  NANOFIELD_AVATAR_SVG
)}`

const BRANDED = "nanofieldBranded"

const mountAvatarSvg = (old: Element) => {
  const tpl = document.createElement("template")
  tpl.innerHTML = NANOFIELD_AVATAR_SVG.trim()
  const svg = tpl.content.firstElementChild as SVGSVGElement | null
  if (!svg) {
    return
  }
  svg.setAttribute("width", "100%")
  svg.setAttribute("height", "100%")
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet")
  svg.setAttribute("data-nanofield-avatar", "true")
  old.replaceWith(svg)
}

// The stock Medusa avatar/logo SVGs (verified in the dashboard source):
// - AvatarBox on login: inline svg viewBox "0 0 400 400"
// - LogoBox on reset-password & co: inline svg viewBox "0 0 36 38"
// Replaces the artwork in place, keeping the surrounding box styles.
export const replaceAvatarLogos = () => {
  document
    .querySelectorAll('svg[viewBox="0 0 400 400"], svg[viewBox="0 0 36 38"]')
    .forEach((svg) => {
      if (svg.hasAttribute("data-nanofield-avatar")) {
        return
      }
      const box = svg.closest("div")
      if (box?.hasAttribute("data-nanofield-brand")) {
        return
      }
      mountAvatarSvg(svg)
    })
}

export const swapMedusaImages = () => {
  document.querySelectorAll<HTMLImageElement>("img[src*='medusa' i]").forEach(
    (img) => {
      if (img.dataset[BRANDED] === "true") {
        return
      }
      img.dataset[BRANDED] = "true"
      img.src = NANOFIELD_AVATAR_DATA_URI
      img.alt = "Nanofield"
      img.style.objectFit = "contain"
    }
  )
}

export const applyTitle = () => {
  const titleEl = document.querySelector("title")
  if (!titleEl) {
    return
  }
  // "Products - Medusa" -> "Products - Nanofield"; a page already named
  // Nanofield collapses ("Nanofield - Nanofield" -> "Nanofield").
  const parts = (titleEl.textContent ?? "")
    .split(" - ")
    .map((p) => p.replace(/medusa/gi, "Nanofield").trim())
    .filter((p) => p.length > 0)
    .filter((p, i, arr) => p !== arr[i - 1])
  const next = parts.length > 0 ? parts.join(" - ") : "Nanofield Admin"
  // Guarded: setting textContent always fires a childList mutation, which
  // would re-trigger the observing caller forever and freeze the tab.
  if (titleEl.textContent !== next) {
    titleEl.textContent = next
  }
}

export const applyFavicon = () => {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
  if (!link) {
    link = document.createElement("link")
    link.rel = "icon"
    document.head.appendChild(link)
  }
  link.type = "image/svg+xml"
  if (link.getAttribute("href") !== NANOFIELD_AVATAR_DATA_URI) {
    link.setAttribute("href", NANOFIELD_AVATAR_DATA_URI)
  }
}

const FONT_LINKS = [
  "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
  "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap",
]

// Same typefaces as the Nanofield storefront (Outfit body, Manrope
// headings) so the admin feels like the same product.
export const applyFonts = () => {
  for (const href of FONT_LINKS) {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = href
      document.head.appendChild(link)
    }
  }
  if (!document.getElementById("nanofield-fonts")) {
    const style = document.createElement("style")
    style.id = "nanofield-fonts"
    // Blanket override: Medusa components set their own font stacks via
    // utility classes, so body inheritance alone doesn't reach them. Mono
    // elements (SKUs, code, shortcuts) keep their monospace stack.
    style.textContent = `
      body, body *:not(code):not(pre):not(kbd):not(samp) { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif !important; }
      h1, h2, h3 { font-family: 'Manrope', 'Outfit', ui-sans-serif, sans-serif !important; }
    `
    document.head.appendChild(style)
  }
}

// Squared-tile backdrop like the storefront blueprint grid, scoped to the
// full-viewport auth screens (login, reset password). Larger tiles with a
// radial fade toward the corners, plus a gentle float+glow on the brand
// avatar so the login mark feels alive.
export const applyLoginTiles = () => {
  if (!document.getElementById("nanofield-tiles")) {
    const style = document.createElement("style")
    style.id = "nanofield-tiles"
    style.textContent = `
      div.bg-ui-bg-subtle.min-h-dvh {
        background-image:
          linear-gradient(to right, rgba(14, 124, 140, 0.12) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(14, 124, 140, 0.12) 1px, transparent 1px);
        background-size: 44px 44px;
        -webkit-mask-image: radial-gradient(ellipse 90% 85% at 50% 45%, black 35%, transparent 78%);
        mask-image: radial-gradient(ellipse 90% 85% at 50% 45%, black 35%, transparent 78%);
      }
      html.dark div.bg-ui-bg-subtle.min-h-dvh {
        background-image:
          linear-gradient(to right, rgba(45, 190, 210, 0.14) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(45, 190, 210, 0.14) 1px, transparent 1px);
      }
      @keyframes nanofield-avatar-float {
        0%, 100% { transform: translateY(0); filter: drop-shadow(0 0 0 rgba(14, 124, 140, 0)); }
        50% { transform: translateY(-4px); filter: drop-shadow(0 6px 14px rgba(14, 124, 140, 0.35)); }
      }
      svg[data-nanofield-avatar] {
        animation: nanofield-avatar-float 5s ease-in-out infinite;
        transform-origin: center;
      }
      @media (prefers-reduced-motion: reduce) {
        svg[data-nanofield-avatar] { animation: none; }
      }
    `
    document.head.appendChild(style)
  }
}

export const removeLoginTiles = () => {
  document.getElementById("nanofield-tiles")?.remove()
}

const STOCK_HEADINGS = new Set([
  "Welcome to Medusa",
  "Sign in to access the account area",
  "Welcome to MedusaSign in to access the account area",
])

// Hides the stock login heading block. Scoped away from our own widget
// subtree; safe to re-run after i18n re-renders.
export const hideStockLoginHeadings = () => {
  const nodes = document.querySelectorAll("h1, h2, h3, p, span, div")
  nodes.forEach((el) => {
    if (el.closest("[data-nanofield-brand]")) {
      return
    }
    if (STOCK_HEADINGS.has((el.textContent ?? "").trim())) {
      ;(el as HTMLElement).style.display = "none"
    }
  })
}
