// Customer email templates (pure functions — unit-tested, no imports).
// One shared shell (branded header, support footer) + one content block per
// event. Table layout + inline styles only: Gmail/Outlook strip <style>.
// Voice: short, warm, one component-flavored touch per mail — never cute
// enough to obscure the facts (amounts, AWB, links).
export type TemplateData = {
  displayId?: number | string
  totalFormatted?: string
  trackingUrl?: string
  courier?: string
  awb?: string
  qrUrl?: string
  contact?: {
    whatsapp?: string
    email?: string
    address?: string
  }
  [key: string]: unknown
}

export type RenderedTemplate = {
  subject: string
  html: string
  text: string
}

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const orderRef = (data: TemplateData): string =>
  data.displayId !== undefined && data.displayId !== ""
    ? `#${data.displayId}`
    : "your order"

// Order timeline with the current stage marked. Text glyphs only — renders
// identically in every mail client, light or dark mode.
const STAGES = ["Confirmed", "Packed", "Shipped", "Delivered"] as const

const timelineHtml = (active: number): string => {
  const cells = STAGES.map((stage, i) => {
    const done = i < active
    const current = i === active
    const dot = current ? "●" : done ? "●" : "○"
    const color = current || done ? "#0E7C8C" : "#a1a1aa"
    const weight = current ? "bold" : "normal"
    return (
      `<td align="center" style="font-size:12px;color:${color};` +
      `font-weight:${weight};padding:4px 2px;">${dot}<br>${stage}</td>`
    )
  }).join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`
}

const timelineText = (active: number): string =>
  STAGES.map((stage, i) =>
    i < active ? `[x] ${stage}` : i === active ? `[>] ${stage}` : `[ ] ${stage}`
  ).join("  ")

const buttonHtml = (href: string, label: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#0E7C8C" style="border-radius:6px;"><a href="${esc(href)}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">${esc(label)}</a></td></tr></table>`

const shell = (
  title: string,
  preheader: string,
  bodyHtml: string,
  contact?: TemplateData["contact"]
): string => {
  const wa = contact?.whatsapp ? `<br>WhatsApp: ${esc(contact.whatsapp)}` : ""
  const email = contact?.email ? `<br>${esc(contact.email)}` : ""
  const address = contact?.address ? `<br>${esc(contact.address)}` : ""
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head>` +
    `<body style="margin:0;padding:0;background-color:#f4f4f5;">` +
    `<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">` +
    `<tr><td style="padding:28px 32px 0;text-align:center;font-size:22px;font-weight:bold;letter-spacing:4px;color:#0E7C8C;">NANOFIELD</td></tr>` +
    `<tr><td style="padding:8px 32px 0;"><div style="border-top:2px solid #0E7C8C;">&nbsp;</div></td></tr>` +
    `<tr><td style="padding:20px 32px 8px;font-size:20px;font-weight:bold;color:#111111;">${esc(title)}</td></tr>` +
    `<tr><td style="padding:0 32px 8px;font-size:14px;line-height:1.6;color:#333333;">${bodyHtml}</td></tr>` +
    `<tr><td style="padding:20px 32px;font-size:12px;line-height:1.6;color:#888888;border-top:1px solid #eeeeee;">Nanofield — precision electronic components${wa}${email}${address}</td></tr>` +
    `</table></td></tr></table></body></html>`
  )
}

const orderConfirmation = (data: TemplateData): RenderedTemplate => {
  const ref = orderRef(data)
  const total = data.totalFormatted
    ? `<p style="margin:12px 0 0;">Total paid: <strong>${esc(data.totalFormatted)}</strong></p>`
    : ""
  const cta = data.trackingUrl
    ? `<p style="margin:20px 0 8px;">${buttonHtml(data.trackingUrl, "Track your order")}</p>`
    : ""
  const bodyHtml =
    `<p style="margin:0 0 12px;">Thanks for shopping with Nanofield — order <strong>${esc(ref)}</strong> is confirmed and queued for packing.</p>` +
    timelineHtml(0) +
    total +
    cta
  const textLines = [
    `Your Nanofield order ${ref} is confirmed and queued for packing.`,
    timelineText(0),
  ]
  if (data.totalFormatted) {
    textLines.push(`Total paid: ${data.totalFormatted}`)
  }
  if (data.trackingUrl) {
    textLines.push(`Track it here: ${data.trackingUrl}`)
  }
  return {
    subject: `Your Nanofield order ${ref} is confirmed`,
    html: shell(
      `Order ${ref} confirmed`,
      `Order ${ref} confirmed — we're packing it.`,
      bodyHtml,
      data.contact
    ),
    text: textLines.join("\n"),
  }
}

const orderShipped = (data: TemplateData): RenderedTemplate => {
  const ref = orderRef(data)
  const awbBlock = data.awb
    ? `<p style="margin:12px 0 0;">Courier: <strong>${esc(data.courier || "JNE / J&T")}</strong><br><span style="font-family:monospace;font-size:18px;font-weight:bold;letter-spacing:1px;">${esc(data.awb)}</span></p>`
    : `<p style="margin:12px 0 0;">Your AWB is being booked with the courier right now — reply to this email or WhatsApp us and we'll send the number.</p>`
  const qrBlock = data.qrUrl
    ? `<p style="margin:16px 0 0;text-align:center;"><img src="${esc(data.qrUrl)}" alt="Scan to track order ${esc(ref)}" width="120" height="120"><br><span style="font-size:11px;color:#888888;">SCAN TO TRACK</span></p>`
    : ""
  const cta = data.trackingUrl
    ? `<p style="margin:20px 0 8px;">${buttonHtml(data.trackingUrl, "Track your parcel")}</p>`
    : ""
  const bodyHtml =
    `<p style="margin:0 0 12px;">Good news — order <strong>${esc(ref)}</strong> left our Pasar Jambi bench and is on its way to you.</p>` +
    timelineHtml(2) +
    awbBlock +
    qrBlock +
    cta
  const textLines = [
    `Your Nanofield order ${ref} has shipped.`,
    timelineText(2),
  ]
  if (data.awb) {
    textLines.push(`Courier: ${data.courier || "JNE / J&T"} — AWB: ${data.awb}`)
  } else {
    textLines.push(
      "Your AWB is being booked — reply here or WhatsApp us for the number."
    )
  }
  if (data.trackingUrl) {
    textLines.push(`Track it here: ${data.trackingUrl}`)
  }
  return {
    subject: `Your Nanofield order ${ref} has shipped`,
    html: shell(
      `Order ${ref} shipped`,
      data.awb ? `AWB ${data.awb} — order ${ref} is on its way.` : `Order ${ref} is on its way.`,
      bodyHtml,
      data.contact
    ),
    text: textLines.join("\n"),
  }
}

const orderDelivered = (data: TemplateData): RenderedTemplate => {
  const ref = orderRef(data)
  const cta = data.trackingUrl
    ? `<p style="margin:20px 0 8px;">${buttonHtml(data.trackingUrl, "View your order")}</p>`
    : ""
  const bodyHtml =
    `<p style="margin:0 0 12px;">Delivered — enjoy your components. Order <strong>${esc(ref)}</strong> is signed, sealed, and in your hands.</p>` +
    timelineHtml(3) +
    `<p style="margin:12px 0 0;">Something off with the parcel? Reply within a few days and we'll sort a return or replacement.</p>` +
    cta
  return {
    subject: `Order ${ref} delivered — enjoy your components`,
    html: shell(
      `Order ${ref} delivered`,
      `Order ${ref} delivered — enjoy your components.`,
      bodyHtml,
      data.contact
    ),
    text: [
      `Your Nanofield order ${ref} was delivered — enjoy your components.`,
      timelineText(3),
      "Something off? Reply within a few days for a return or replacement.",
      ...(data.trackingUrl ? [`View it here: ${data.trackingUrl}`] : []),
    ].join("\n"),
  }
}

const orderCanceled = (data: TemplateData): RenderedTemplate => {
  const ref = orderRef(data)
  const bodyHtml =
    `<p style="margin:0 0 12px;">Order <strong>${esc(ref)}</strong> was canceled — no money moved, and nothing will ship.</p>` +
    `<p style="margin:12px 0 0;">If you paid already, the refund is on its way back to your original payment method. Need anything else? Just reply to this email.</p>`
  return {
    subject: `Order ${ref} was canceled`,
    html: shell(
      `Order ${ref} canceled`,
      `Order ${ref} was canceled — no money moved.`,
      bodyHtml,
      data.contact
    ),
    text: [
      `Your Nanofield order ${ref} was canceled — no money moved, nothing will ship.`,
      "If you paid already, the refund is on its way back. Reply here for help.",
    ].join("\n"),
  }
}

export const TEMPLATES: Record<
  string,
  (data: TemplateData) => RenderedTemplate
> = {
  "nanofield-order-confirmation": orderConfirmation,
  "nanofield-order-shipped": orderShipped,
  "nanofield-order-delivered": orderDelivered,
  "nanofield-order-canceled": orderCanceled,
}
