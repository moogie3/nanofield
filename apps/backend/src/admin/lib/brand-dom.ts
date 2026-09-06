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

// --- Circuit-board login backdrop ----------------------------------------
// Full-viewport fixed layer (behind the form) with etched circuit traces
// and floating semiconductor icons. Replaces the square tiles.

const CIRCUIT_SCENE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
  <style>
    .nf-tr { stroke: var(--nf-circuit); stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .nf-via { fill: var(--nf-circuit-strong); filter: drop-shadow(0 0 4px var(--nf-glow)); animation: nanofield-via-blink 2.8s ease-in-out infinite; }
    .nf-silk { fill: var(--nf-circuit-strong); opacity: 0.75; font-family: 'Outfit', ui-sans-serif, sans-serif; letter-spacing: 2px; }
    .nf-fid { stroke: var(--nf-circuit-strong); stroke-width: 1.5; fill: none; opacity: 0.8; }
    .nf-pad { fill: var(--nf-circuit); opacity: 0.55; }
  </style>
  <g>
    <path class="nf-tr" d="M-20 120 H260 L300 160 H520 L560 200 H820" />
    <circle class="nf-via" cx="820" cy="200" r="5" />
    <circle class="nf-via" cx="-20" cy="120" r="5" />
    <path class="nf-tr" d="M-20 680 H180 L220 640 H420" />
    <circle class="nf-via" cx="420" cy="640" r="5" />
    <path class="nf-tr" d="M1220 240 H980 L940 280 H760" />
    <circle class="nf-via" cx="760" cy="280" r="5" />
    <path class="nf-tr" d="M1220 620 H1040 L1000 580 H860 L820 620 H700" />
    <circle class="nf-via" cx="700" cy="620" r="5" />
    <path class="nf-tr" d="M200 -20 V140 L240 180 V300" />
    <circle class="nf-via" cx="240" cy="300" r="5" />
    <path class="nf-tr" d="M1020 -20 V100 L980 140 V220" />
    <circle class="nf-via" cx="980" cy="220" r="5" />
    <path class="nf-tr" d="M420 820 V700 L460 660 V560" />
    <circle class="nf-via" cx="460" cy="560" r="5" />
    <path class="nf-tr" d="M880 820 V720" />
    <circle class="nf-via" cx="880" cy="720" r="5" />
    <path class="nf-tr" d="M-20 360 H120 L150 390 H300" />
    <circle class="nf-via" cx="300" cy="390" r="5" />
    <path class="nf-tr" d="M1220 420 H1100 L1070 450 H980" />
    <circle class="nf-via" cx="980" cy="450" r="5" />
    <path class="nf-tr" d="M560 -20 V60 L590 90 V150" />
    <circle class="nf-via" cx="590" cy="150" r="5" />
    <path class="nf-tr" d="M640 820 V740 L670 710 H760" />
    <circle class="nf-via" cx="760" cy="710" r="5" />
    <path class="nf-tr" d="M60 -20 V60" />
    <circle class="nf-via" cx="60" cy="60" r="4" />
    <path class="nf-tr" d="M1140 -20 V50" />
    <circle class="nf-via" cx="1140" cy="50" r="4" />
    <path class="nf-tr" d="M-20 500 H90 L120 530 H210" />
    <circle class="nf-via" cx="210" cy="530" r="5" />
    <path class="nf-tr" d="M1220 120 H1120 L1090 150 H1010" />
    <circle class="nf-via" cx="1010" cy="150" r="5" />
    <path class="nf-tr" d="M340 -20 V40 L370 70 V130" />
    <circle class="nf-via" cx="370" cy="130" r="4" />
    <path class="nf-tr" d="M760 -20 V30" />
    <circle class="nf-via" cx="760" cy="30" r="4" />
    <path class="nf-tr" d="M-20 60 H80 L110 90 H170" />
    <circle class="nf-via" cx="170" cy="90" r="4" />
    <path class="nf-tr" d="M1220 720 H1140 L1110 690 H1050" />
    <circle class="nf-via" cx="1050" cy="690" r="4" />
    <path class="nf-tr" d="M260 820 V760 L290 730 H350" />
    <circle class="nf-via" cx="350" cy="730" r="4" />
    <path class="nf-tr" d="M520 820 V780 H580" />
    <circle class="nf-via" cx="580" cy="780" r="4" />
    <path class="nf-tr" d="M660 110 H700 V86 H740 V110 H780 V86 H820" />
    <g font-size="13">
      <text class="nf-silk" x="150" y="505">U1</text>
      <text class="nf-silk" x="700" y="175">R12</text>
      <text class="nf-silk" x="950" y="565">C48</text>
      <text class="nf-silk" x="250" y="725">J2</text>
      <text class="nf-silk" x="1075" y="345">5V</text>
      <text class="nf-silk" x="85" y="285">GND</text>
      <text class="nf-silk" x="600" y="645">NF-1</text>
      <text class="nf-silk" x="330" y="118">R13</text>
      <text class="nf-silk" x="880" y="118">C49</text>
      <text class="nf-silk" x="80" y="600">L5</text>
      <text class="nf-silk" x="1050" y="520">D3</text>
      <text class="nf-silk" x="420" y="420">Q2</text>
      <text class="nf-silk" x="760" y="330">U2</text>
      <text class="nf-silk" x="180" y="220">U3</text>
      <text class="nf-silk" x="980" y="760">J3</text>
      <text class="nf-silk" x="540" y="58">TP1</text>
      <text class="nf-silk" x="660" y="762">TP2</text>
      <text class="nf-silk" x="1120" y="220">3V3</text>
      <text class="nf-silk" x="40" y="762">12V</text>
      <text class="nf-silk" x="880" y="38">RST</text>
      <text class="nf-silk" x="340" y="782">CLK</text>
      <text class="nf-silk" x="1010" y="600">SDA</text>
      <text class="nf-silk" x="60" y="180">SCL</text>
      <text class="nf-silk" x="480" y="240">C50</text>
      <text class="nf-silk" x="240" y="340">R14</text>
    </g>
    <g>
      <circle class="nf-via" cx="90" cy="420" r="3" />
      <circle class="nf-fid" cx="90" cy="420" r="8" />
      <circle class="nf-via" cx="1110" cy="700" r="3" />
      <circle class="nf-fid" cx="1110" cy="700" r="8" />
    </g>
    <g>
      <rect class="nf-pad" x="500" y="292" width="24" height="16" rx="2" />
      <rect class="nf-pad" x="532" y="292" width="24" height="16" rx="2" />
      <rect class="nf-pad" x="830" y="462" width="24" height="16" rx="2" />
      <rect class="nf-pad" x="862" y="462" width="24" height="16" rx="2" />
      <rect class="nf-pad" x="300" y="172" width="24" height="16" rx="2" />
      <rect class="nf-pad" x="332" y="172" width="24" height="16" rx="2" />
    </g>
  </g>
</svg>`

// Small component glyphs for the floating swarm (48-grid, teal strokes).
const GLYPH_CHIP = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="15" y="6" width="18" height="28" rx="2" />
    <path d="M8 14 H15 M8 22 H15 M8 30 H15 M33 14 H40 M33 22 H40 M33 30 H40" />
  </g>
  <circle cx="21" cy="11" r="2" fill="var(--nf-glyph)" stroke="none" />
</svg>`

const GLYPH_TRANSISTOR = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="24" cy="19" r="10" />
    <path d="M24 29 V44 M15 41 L21 32 M33 41 L27 32" />
  </g>
</svg>`

const GLYPH_RESISTOR = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 24 H12 L17 14 L23 34 L29 14 L35 24 H44" />
  </g>
</svg>`

const GLYPH_IC = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="10" y="14" width="28" height="20" rx="2" />
    <path d="M16 14 V8 M24 14 V8 M32 14 V8 M16 34 V40 M24 34 V40 M32 34 V40" />
  </g>
  <circle cx="15" cy="19" r="1.8" fill="var(--nf-glyph)" stroke="none" />
</svg>`

const GLYPH_CAPACITOR = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 6 V18 M24 30 V42 M13 18 H35 M13 30 H35" />
  </g>
</svg>`

const GLYPH_DIODE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 24 H19 M19 12 L19 36 L33 24 Z M36 12 V36 M36 24 H44" />
  </g>
</svg>`

const GLYPH_INDUCTOR = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 24 H12 C12 15 24 15 24 24 C24 33 36 33 36 24 H43" />
  </g>
</svg>`

const GLYPH_LED = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 20 L14 34 L26 27 Z M29 20 V34 M8 27 H14 M29 27 H33" />
    <path d="M35 12 L39 8 M38 20 L44 18" />
  </g>
</svg>`

const GLYPH_IGBT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 10 V38 M34 10 V38 M24 6 V42 M19 14 L24 8 L29 14 M14 24 H24 M24 32 H34" />
  </g>
</svg>`

const GLYPH_MOSFET = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 12 V36 M34 12 V36 M24 12 V20 M24 28 V36 M31 24 H24 M27 21 L24 24 L27 27" />
  </g>
</svg>`

const GLYPH_CRYSTAL = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 14 H30 V34 H18 Z M24 14 V6 M24 34 V42 M10 24 H18 M30 24 H38" />
  </g>
</svg>`

const GLYPH_OPAMP = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 10 L36 24 L12 38 Z M4 17 H12 M4 31 H12 M36 24 H44" />
  </g>
</svg>`

const GLYPH_GROUND = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 6 V26 M14 26 H34 M18 32 H30 M21 38 H27" />
  </g>
</svg>`

const GLYPH_FUSE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none">
  <g stroke="var(--nf-glyph)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 24 H14 M34 24 H42 M14 20 H34 V28 H14 M20 24 H28" />
  </g>
</svg>`

// Scattered swarm kept clear of the centered form. Small glyphs spin a
// full turn while bobbing; a few larger ones only bob for variety.
const FLOATERS: {
  glyph: string
  top: string
  left: string
  size: number
  duration: string
  delay: string
  opacity: number
  spin: boolean
}[] = [
  { glyph: "chip", top: "6%", left: "4%", size: 36, duration: "7s", delay: "0s", opacity: 0.9, spin: true },
  { glyph: "transistor", top: "12%", left: "18%", size: 30, duration: "16s", delay: "-2s", opacity: 0.75, spin: true },
  { glyph: "resistor", top: "8%", left: "38%", size: 34, duration: "6s", delay: "-1s", opacity: 0.7, spin: false },
  { glyph: "chip", top: "14%", left: "60%", size: 28, duration: "18s", delay: "0s", opacity: 0.7, spin: true },
  { glyph: "transistor", top: "6%", left: "78%", size: 26, duration: "15s", delay: "-2.5s", opacity: 0.65, spin: true },
  { glyph: "chip", top: "26%", left: "90%", size: 34, duration: "7.5s", delay: "-4s", opacity: 0.85, spin: true },
  { glyph: "resistor", top: "42%", left: "94%", size: 28, duration: "17s", delay: "-3s", opacity: 0.7, spin: true },
  { glyph: "transistor", top: "62%", left: "92%", size: 32, duration: "8s", delay: "-1s", opacity: 0.75, spin: true },
  { glyph: "chip", top: "80%", left: "87%", size: 30, duration: "16s", delay: "-2s", opacity: 0.7, spin: true },
  { glyph: "resistor", top: "90%", left: "68%", size: 28, duration: "6.5s", delay: "-2s", opacity: 0.65, spin: true },
  { glyph: "chip", top: "87%", left: "52%", size: 40, duration: "19s", delay: "-5s", opacity: 0.85, spin: true },
  { glyph: "transistor", top: "90%", left: "30%", size: 30, duration: "7.5s", delay: "0s", opacity: 0.7, spin: true },
  { glyph: "resistor", top: "82%", left: "12%", size: 26, duration: "15s", delay: "-1.5s", opacity: 0.65, spin: true },
  { glyph: "chip", top: "66%", left: "4%", size: 28, duration: "6s", delay: "-1.5s", opacity: 0.65, spin: true },
  { glyph: "transistor", top: "48%", left: "2%", size: 32, duration: "18s", delay: "-4s", opacity: 0.7, spin: true },
  { glyph: "chip", top: "32%", left: "6%", size: 24, duration: "14s", delay: "-3s", opacity: 0.6, spin: true },
  { glyph: "resistor", top: "24%", left: "30%", size: 24, duration: "17s", delay: "-6s", opacity: 0.6, spin: true },
  { glyph: "chip", top: "68%", left: "72%", size: 24, duration: "13s", delay: "-2s", opacity: 0.6, spin: true },
  { glyph: "ic", top: "20%", left: "12%", size: 34, duration: "15s", delay: "-1s", opacity: 0.8, spin: true },
  { glyph: "ic", top: "10%", left: "55%", size: 28, duration: "18s", delay: "-4s", opacity: 0.7, spin: true },
  { glyph: "ic", top: "38%", left: "88%", size: 32, duration: "16s", delay: "-2s", opacity: 0.8, spin: true },
  { glyph: "ic", top: "72%", left: "78%", size: 30, duration: "14s", delay: "-5s", opacity: 0.7, spin: true },
  { glyph: "ic", top: "84%", left: "42%", size: 26, duration: "19s", delay: "-3s", opacity: 0.65, spin: true },
  { glyph: "ic", top: "58%", left: "8%", size: 28, duration: "17s", delay: "-6s", opacity: 0.65, spin: true },
  { glyph: "transistor", top: "50%", left: "96%", size: 26, duration: "15s", delay: "-1s", opacity: 0.6, spin: true },
  { glyph: "resistor", top: "4%", left: "30%", size: 24, duration: "18s", delay: "-3s", opacity: 0.6, spin: true },
  { glyph: "capacitor", top: "22%", left: "12%", size: 26, duration: "16s", delay: "-2s", opacity: 0.7, spin: true },
  { glyph: "diode", top: "36%", left: "84%", size: 28, duration: "14s", delay: "-4s", opacity: 0.7, spin: true },
  { glyph: "inductor", top: "64%", left: "88%", size: 26, duration: "17s", delay: "-1s", opacity: 0.65, spin: true },
  { glyph: "led", top: "78%", left: "22%", size: 24, duration: "15s", delay: "-3s", opacity: 0.65, spin: true },
  { glyph: "capacitor", top: "92%", left: "52%", size: 24, duration: "18s", delay: "-5s", opacity: 0.6, spin: true },
  { glyph: "diode", top: "12%", left: "70%", size: 26, duration: "13s", delay: "-2s", opacity: 0.65, spin: true },
  { glyph: "inductor", top: "52%", left: "6%", size: 24, duration: "19s", delay: "-4s", opacity: 0.6, spin: true },
  { glyph: "led", top: "4%", left: "60%", size: 22, duration: "16s", delay: "-1s", opacity: 0.6, spin: true },
  { glyph: "igbt", top: "28%", left: "44%", size: 26, duration: "15s", delay: "-2s", opacity: 0.7, spin: true },
  { glyph: "mosfet", top: "56%", left: "30%", size: 24, duration: "17s", delay: "-4s", opacity: 0.65, spin: true },
  { glyph: "crystal", top: "74%", left: "56%", size: 26, duration: "14s", delay: "-1s", opacity: 0.7, spin: true },
  { glyph: "opamp", top: "15%", left: "84%", size: 28, duration: "18s", delay: "-3s", opacity: 0.7, spin: true },
  { glyph: "ground", top: "90%", left: "86%", size: 24, duration: "16s", delay: "-2s", opacity: 0.65, spin: true },
  { glyph: "fuse", top: "40%", left: "70%", size: 24, duration: "13s", delay: "-5s", opacity: 0.65, spin: true },
  { glyph: "igbt", top: "64%", left: "20%", size: 22, duration: "19s", delay: "-3s", opacity: 0.6, spin: true },
  { glyph: "mosfet", top: "36%", left: "58%", size: 22, duration: "14s", delay: "-4s", opacity: 0.6, spin: true },
]

const GLYPHS: Record<string, string> = {
  chip: GLYPH_CHIP,
  transistor: GLYPH_TRANSISTOR,
  resistor: GLYPH_RESISTOR,
  ic: GLYPH_IC,
  capacitor: GLYPH_CAPACITOR,
  diode: GLYPH_DIODE,
  inductor: GLYPH_INDUCTOR,
  led: GLYPH_LED,
  igbt: GLYPH_IGBT,
  mosfet: GLYPH_MOSFET,
  crystal: GLYPH_CRYSTAL,
  opamp: GLYPH_OPAMP,
  ground: GLYPH_GROUND,
  fuse: GLYPH_FUSE,
}

export const applyLoginCircuit = () => {
  if (!document.getElementById("nanofield-login-bg")) {
    const style = document.createElement("style")
    style.id = "nanofield-login-bg-style"
    style.textContent = `
      :root { --nf-circuit: rgba(14, 124, 140, 0.16); --nf-circuit-strong: rgba(14, 124, 140, 0.38); --nf-tile: rgba(14, 124, 140, 0.10); --nf-glow: rgba(14, 124, 140, 0.55); --nf-glyph: #8A949C; }
      html.dark { --nf-circuit: rgba(45, 190, 210, 0.20); --nf-circuit-strong: rgba(45, 190, 210, 0.45); --nf-tile: rgba(45, 190, 210, 0.12); --nf-glow: rgba(45, 190, 210, 0.65); --nf-glyph: #C9D1D9; }
      #nanofield-login-bg {
        position: fixed; inset: 0; z-index: 0; pointer-events: none;
        background-image:
          linear-gradient(to right, var(--nf-tile) 1px, transparent 1px),
          linear-gradient(to bottom, var(--nf-tile) 1px, transparent 1px);
        background-size: 44px 44px;
        -webkit-mask-image: radial-gradient(ellipse 95% 90% at 50% 45%, black 30%, transparent 80%);
        mask-image: radial-gradient(ellipse 95% 90% at 50% 45%, black 30%, transparent 80%);
      }
      #nanofield-login-bg .nf-floater {
        position: absolute;
        animation: nanofield-drift 7s ease-in-out infinite;
      }
      @keyframes nanofield-bob {
        0%, 100% { transform: translateY(0); filter: drop-shadow(0 0 0 rgba(14, 124, 140, 0)); }
        50% { transform: translateY(-10px); filter: drop-shadow(0 8px 14px rgba(14, 124, 140, 0.30)); }
      }
      @keyframes nanofield-drift {
        0% { transform: translateY(0) rotate(0deg); filter: drop-shadow(0 0 0 rgba(14, 124, 140, 0)); }
        50% { transform: translateY(-12px) rotate(180deg); filter: drop-shadow(0 8px 14px rgba(14, 124, 140, 0.30)); }
        100% { transform: translateY(0) rotate(360deg); filter: drop-shadow(0 0 0 rgba(14, 124, 140, 0)); }
      }
      @keyframes nanofield-via-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      circle.nf-via { animation: nanofield-via-blink 2.8s ease-in-out infinite; }
      circle.nf-via:nth-of-type(3n) { animation-delay: -0.9s; }
      circle.nf-via:nth-of-type(3n+1) { animation-delay: -1.8s; }
      @keyframes nanofield-avatar-float {
        0%, 100% { transform: translateY(0); filter: drop-shadow(0 0 0 rgba(14, 124, 140, 0)); }
        50% { transform: translateY(-4px); filter: drop-shadow(0 6px 14px rgba(14, 124, 140, 0.35)); }
      }
      svg[data-nanofield-avatar] {
        animation: nanofield-avatar-float 5s ease-in-out infinite;
        transform-origin: center;
      }
      div[class*="max-w-[280px]"] { position: relative; z-index: 1; }
      @media (prefers-reduced-motion: reduce) {
        #nanofield-login-bg .nf-floater, svg[data-nanofield-avatar], circle.nf-via { animation: none; }
      }
    `
    document.head.appendChild(style)

    const layer = document.createElement("div")
    layer.id = "nanofield-login-bg"
    layer.setAttribute("aria-hidden", "true")
    const scene = document.createElement("div")
    scene.style.cssText = "position:absolute;inset:0;"
    scene.innerHTML = CIRCUIT_SCENE
    layer.appendChild(scene)
    for (const f of FLOATERS) {
      const el = document.createElement("div")
      el.className = "nf-floater"
      el.style.cssText =
        `top:${f.top};left:${f.left};width:${f.size}px;height:${f.size}px;` +
        `opacity:${f.opacity};animation-name:${f.spin ? "nanofield-drift" : "nanofield-bob"};` +
        `animation-duration:${f.duration};animation-delay:${f.delay};`
      el.innerHTML = GLYPHS[f.glyph]
      layer.appendChild(el)
    }
    document.body.appendChild(layer)
  }
}

export const removeLoginCircuit = () => {
  document.getElementById("nanofield-login-bg")?.remove()
  document.getElementById("nanofield-login-bg-style")?.remove()
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

// Exact-match replacements for stock Medusa UI copy (workflows subtitle,
// invite page, API-key hint, ...). Full-sentence match ONLY — never
// substrings — so merchant data (e.g. a product literally named
// "Medusa ...") is never touched.
const STATIC_COPY: Record<string, string> = {
  "View and keep track of workflow executions in your Medusa application.":
    "View and keep track of workflow executions in your Nanofield store.",
  "Manage translations of your data in Medusa":
    "Manage translations of your data in Nanofield",
  "Create a new secret API key to access the Medusa API as an authenticated admin user.":
    "Create a new secret API key to access the Nanofield API as an authenticated admin user.",
  "Notifications about Medusa activities will be listed here.":
    "Notifications about Nanofield activities will be listed here.",
  "Get started with Medusa Admin right away.":
    "Get started with Nanofield right away.",
  "Start Medusa Admin": "Open Nanofield Admin",
  "Welcome to Medusa": "Welcome to Nanofield",
}

export const scrubStaticCopy = () => {
  // User-menu links that leave the app: Documentation + Changelog.
  document
    .querySelectorAll(
      'a[href*="docs.medusajs.com"], a[href*="medusajs.com/changelog"]'
    )
    .forEach((a) => {
      const item = a.closest('[role="menuitem"], [role="menuitemradio"], li')
      ;((item ?? a) as HTMLElement).style.display = "none"
    })

  // Hiding those links can leave two separators adjacent (the double
  // border). Collapse any separator that sits next to another separator
  // or a hidden node.
  const isGone = (el: Element | null): boolean =>
    !el ||
    (el as HTMLElement).style.display === "none" ||
    el.getAttribute("role") === "separator"
  document.querySelectorAll('[role="separator"]').forEach((sep) => {
    const prev = sep.previousElementSibling
    const next = sep.nextElementSibling
    if (isGone(prev) || isGone(next)) {
      ;(sep as HTMLElement).style.display = "none"
    }
  })

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const targets: Text[] = []
  let node: Text | null
  let guard = 0
  while ((node = walker.nextNode() as Text | null) && guard++ < 4000) {
    targets.push(node)
  }
  for (const t of targets) {
    const text = (t.textContent ?? "").trim()
    if (!text) {
      continue
    }
    const parent = t.parentElement
    if (!parent || parent.closest("[data-nanofield-brand]")) {
      continue
    }
    if (/^(INPUT|TEXTAREA|SCRIPT|STYLE|CODE|PRE)$/.test(parent.tagName)) {
      continue
    }
    const replacement = STATIC_COPY[text]
    if (replacement) {
      t.textContent = (t.textContent ?? "").replace(text, replacement)
    }
  }
}
