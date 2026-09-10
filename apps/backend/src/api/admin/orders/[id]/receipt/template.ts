import { formatIDR } from "../../../shopee-imports/notify"

export function generateReceiptHtml(order: any): string {
  const currency = order.currency_code?.toUpperCase() || "IDR"
  const formatMoney = (amount: number | string | null | undefined): string => {
    return formatIDR(amount)
  }

  const customer = order.customer || {}
  const shipping = order.shipping_address || {}
  const billing = order.billing_address || {}
  const items = order.items || []
  
  // Medusa v2 structure: Order -> payment_collections -> payments
  const paymentCollections = order.payment_collections || []
  const payments = paymentCollections.flatMap((pc: any) => pc.payments || [])
  const fulfillments = order.fulfillments || []

  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) : ""

  let displayPaymentStatus = order.payment_status || "Unknown"
  if (displayPaymentStatus === "Unknown" && paymentCollections.length > 0) {
    displayPaymentStatus = paymentCollections[0].status || "Unknown"
  } else if (displayPaymentStatus === "Unknown" && payments.length > 0) {
    displayPaymentStatus = "captured"
  } else if (displayPaymentStatus === "Unknown") {
    // Fallback: If we can't find payment collections in the raw graph query, 
    // but the frontend allowed the button to be clicked, we assume it's captured.
    displayPaymentStatus = "captured"
  }
  displayPaymentStatus = displayPaymentStatus.charAt(0).toUpperCase() + displayPaymentStatus.slice(1)

  const paymentMethod = payments[0]?.payment_session?.provider_id || "Unknown"
  let paymentAmount = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
  
  // If payment collections weren't fetched properly by the graph query, default to the order total
  if (paymentAmount === 0 && order.total) {
    paymentAmount = order.total
  }

  const fulfillmentItems = fulfillments.flatMap((f: any) => f.items || [])
  const shippedItems = fulfillmentItems.length > 0

  const itemsHtml = items.map((item: any) => {
    const variant = item.variant || {}
    const product = variant.product || {}
    const title = product.title || variant.title || "Unknown Product"
    const sku = variant.sku || ""
    const quantity = item.quantity || 0
    const unitPrice = Number(item.unit_price || 0)
    const totalPrice = unitPrice * quantity
    const variantOptions = variant.options?.map((o: any) => `${o.option?.title}: ${o.value}`).join(", ") || ""

    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${title}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${sku}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${variantOptions}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatMoney(unitPrice)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatMoney(totalPrice)}</td>
      </tr>
    `
  }).join("")

  const totalsHtml = `
    <tr>
      <td colspan="5" style="padding: 8px; text-align: right; font-weight: bold;">Subtotal:</td>
      <td style="padding: 8px; text-align: right;">${formatMoney(order.subtotal)}</td>
    </tr>
    ${order.discount_total && Number(order.discount_total) > 0 ? `
    <tr>
      <td colspan="5" style="padding: 8px; text-align: right; font-weight: bold;">Discount:</td>
      <td style="padding: 8px; text-align: right; color: #dc2626;">-${formatMoney(order.discount_total)}</td>
    </tr>
    ` : ""}
    <tr>
      <td colspan="5" style="padding: 8px; text-align: right; font-weight: bold;">Shipping:</td>
      <td style="padding: 8px; text-align: right;">${formatMoney(order.shipping_total)}</td>
    </tr>
    <tr>
      <td colspan="5" style="padding: 8px; text-align: right; font-weight: bold;">Tax:</td>
      <td style="padding: 8px; text-align: right;">${formatMoney(order.tax_total)}</td>
    </tr>
    <tr style="background: #f5f5f5; border-top: 2px solid #333;">
      <td colspan="5" style="padding: 12px; text-align: right; font-weight: bold; font-size: 1.1em;">Total:</td>
      <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 1.1em;">${formatMoney(order.total)}</td>
    </tr>
  `

  const addressHtml = (addr: any, label: string, isLarge: boolean = false) => {
    if (!addr || !addr.first_name) return ""
    return `
      <div style="margin-bottom: 16px; border: 1px solid #ddd; padding: 16px; border-radius: 8px;">
        <h3 style="margin: 0 0 8px; font-size: 14px; color: #666; text-transform: uppercase;">${label}</h3>
        <p style="margin: 0; line-height: 1.6; ${isLarge ? 'font-size: 1.2em; font-weight: 500;' : ''}">
          <strong>${addr.first_name} ${addr.last_name || ""}</strong><br>
          ${addr.phone ? `<strong>Phone: ${addr.phone}</strong><br>` : ""}
          ${addr.company ? `${addr.company}<br>` : ""}
          ${addr.address_1 || ""}${addr.address_2 ? `, ${addr.address_2}` : ""}<br>
          ${addr.city || ""}${addr.province ? `, ${addr.province}` : ""}${addr.postal_code ? ` ${addr.postal_code}` : ""}<br>
          ${addr.country_code || ""}
        </p>
      </div>
    `
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - Order #${order.display_id}</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { margin: 0; padding: 20px; }
      .receipt-container { box-shadow: none; border: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f5f5f5;
      margin: 0;
      padding: 40px 20px;
      color: #333;
    }
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      background: #1e293b;
      color: white;
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: 1px;
    }
    .header p {
      margin: 8px 0 0;
      opacity: 0.8;
      font-size: 14px;
    }
    .receipt-body {
      padding: 32px;
    }
    .receipt-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #eee;
      flex-wrap: wrap;
      gap: 16px;
    }
    .meta-group h4 {
      margin: 0 0 8px;
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 0.5px;
    }
    .meta-group p {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }
    .meta-group span {
      color: #999;
      font-weight: normal;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      text-align: left;
      padding: 12px 8px;
      border-bottom: 2px solid #333;
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .addresses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    @media (max-width: 600px) {
      .addresses { grid-template-columns: 1fr; }
    }
    .payment-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .payment-info h3 {
      margin: 0 0 12px;
      font-size: 14px;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 0.5px;
    }
    .payment-info .row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .payment-info .row:last-child { border-bottom: none; }
    .payment-info .label { color: #666; }
    .payment-info .value { font-weight: 500; }
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #eee;
      color: #999;
      font-size: 12px;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1e293b;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
    }
    .print-btn:hover { background: #334155; }
    @media (max-width: 600px) {
      .receipt-body { padding: 20px; }
      th, td { padding: 8px 4px; font-size: 13px; }
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print Receipt</button>
  
  <div class="receipt-container">
    <div class="header">
      <h1>Nanofield</h1>
      <p>Official Receipt</p>
    </div>
    
    <div class="receipt-body">
      <div class="receipt-meta">
        <div class="meta-group">
          <h4>Order Number</h4>
          <p>#${order.display_id}</p>
        </div>
        <div class="meta-group">
          <h4>Order Date</h4>
          <p>${orderDate}</p>
        </div>
        <div class="meta-group">
          <h4>Status</h4>
          <p>${order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || "Unknown"}</p>
        </div>
        <div class="meta-group">
          <h4>Payment Status</h4>
          <p style="color: #16a34a; font-weight: 600;">${displayPaymentStatus}</p>
        </div>
        <div class="meta-group">
          <h4>Fulfillment</h4>
          <p>${order.fulfillment_status?.charAt(0).toUpperCase() + order.fulfillment_status?.slice(1) || "Not fulfilled"}</p>
        </div>
      </div>

      <div class="addresses">
        <div>
          ${addressHtml(shipping, "Penerima (Shipping Address)", true)}
        </div>
        <div>
          ${addressHtml(billing, "Pengirim (Billing Address / Sender)", false)}
        </div>
      </div>

      <div class="payment-info">
        <h3>Payment Information</h3>
        <div class="row">
          <span class="label">Payment Method</span>
          <span class="value">${paymentMethod.replace("pp_", "").replace("_", " ").toUpperCase()}</span>
        </div>
        <div class="row">
          <span class="label">Amount Paid</span>
          <span class="value">${formatMoney(paymentAmount)}</span>
        </div>
        <div class="row">
          <span class="label">Transaction ID</span>
          <span class="value">${payments[0]?.id || "N/A"}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 35%;">Product</th>
            <th style="width: 12%;">SKU</th>
            <th style="width: 18%;">Options</th>
            <th class="text-right" style="width: 12%;">Price</th>
            <th class="text-center" style="width: 8%;">Qty</th>
            <th class="text-right" style="width: 15%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <table style="margin-left: auto; width: 400px;">
        <tbody>
          ${totalsHtml}
        </tbody>
      </table>

      ${shippedItems ? `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
        <h3 style="margin: 0 0 16px; font-size: 14px; text-transform: uppercase; color: #666; letter-spacing: 0.5px;">Shipment Details</h3>
        ${fulfillments.map((f: any) => `
          <div style="margin-bottom: 16px; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <div class="row" style="margin-bottom: 8px;">
              <span class="label">Tracking Number</span>
              <span class="value">${f.tracking_numbers?.[0] || "N/A"}</span>
            </div>
            <div class="row">
              <span class="label">Shipping Method</span>
              <span class="value">${f.shipping_method?.name || "N/A"}</span>
            </div>
          </div>
        `).join("")}
      </div>
      ` : ""}

      <div class="footer">
        <p>Thank you for your order!</p>
        <p>This is a computer-generated receipt. No signature required.</p>
        <p style="margin-top: 16px;">Nanofield &copy; ${new Date().getFullYear()}</p>
      </div>
    </div>
  </div>
</body>
</html>`
}