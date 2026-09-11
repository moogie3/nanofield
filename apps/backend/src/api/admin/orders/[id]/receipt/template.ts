export function generateReceiptHtml(order: any): string {
  const shipping = order.shipping_address || {}

  const addressHtml = (addr: any, label: string, isLarge: boolean = false) => {
    if (!addr || !addr.first_name) return ""
    return `
      <div class="address-block">
        <div class="address-header" style="padding: 12px 16px; border-bottom: 2px solid #000; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #000;">
          ${label}
        </div>
        <div style="padding: 16px;">
          <div class="address-content" style="margin: 0; line-height: 1.5; ${isLarge ? "font-size: 1.25em; font-weight: 700;" : "font-size: 1.15em; font-weight: 600;"} word-wrap: break-word; display: flex; flex-direction: column; justify-content: center;">
            <span style="font-family: 'Outfit', 'Manrope', sans-serif !important;">${addr.first_name} ${addr.last_name || ""}</span>
            ${addr.phone ? `<span style="font-family: 'Outfit', 'Manrope', sans-serif !important;">Phone: ${addr.phone}</span>` : ""}
            <span style="font-weight: 500; font-size: 0.85em; display: inline-block; margin-top: 6px; font-family: 'Manrope', sans-serif !important;">
              ${addr.company ? `${addr.company}<br>` : ""}
              ${addr.address_1 || ""}${addr.address_2 ? `, ${addr.address_2}` : ""}<br>
              ${addr.city || ""}${addr.province ? `, ${addr.province}` : ""}${addr.postal_code ? ` ${addr.postal_code}` : ""}<br>
              ${addr.country_code?.toUpperCase() || ""}
            </span>
          </div>
        </div>
      </div>
    `
  }

  const nanofieldSender = {
    first_name: process.env.STORE_NAME || "Nanofield",
    last_name: "",
    phone: process.env.STORE_PHONE || "+62 851-2155-0532", 
    address_1: process.env.STORE_ADDRESS_1 || "Pasar Jambi",
    city: process.env.STORE_CITY || "Jambi",
    province: process.env.STORE_PROVINCE || "Jambi",
    country_code: process.env.STORE_COUNTRY_CODE || "id"
  }

  const trackingUrl = `https://nanofield.com/order/${order.id}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=4&data=${encodeURIComponent(trackingUrl)}`

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipping Label - Order #${order.display_id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @media print {
      @page { margin: 0; }
      .no-print { display: none !important; }
      body { margin: 0; padding: 0; background: white !important; }
      .receipt-container {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 4mm !important;
        font-size: 12pt !important;
      }
      .store-title { font-size: 24pt !important; }
      .address-header { font-size: 11pt !important; }
      .sender-row { gap: 3mm !important; }
      .qr-box { width: 30mm !important; flex-basis: 30mm !important; }
      .qr-box img { width: 26mm !important; height: 26mm !important; }
      .qr-box span { font-size: 8pt !important; }
      .footer { font-size: 9pt !important; }
    }
    * {
      box-sizing: border-box;
      font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif !important;
    }
    body {
      background: #f5f5f5;
      margin: 0;
      padding: 40px 20px;
      color: #000;
    }
    .store-title {
      font-family: 'Outfit', 'Manrope', sans-serif !important;
      margin: 0;
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    /* ~80mm thermal preview width; print uses full paper width */
    .receipt-container {
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e5e5e5;
      padding: 20px;
      font-size: 17px;
    }
    .header {
      text-align: center;
      padding-bottom: 16px;
      border-bottom: 3px solid #000;
      margin-bottom: 16px;
    }
    .address-block {
      border: 2px solid #000;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .sender-row {
      display: flex;
      gap: 16px;
      align-items: stretch;
      margin-bottom: 16px;
    }
    .sender-row .address-block {
      flex: 1;
      min-width: 0;
      margin-bottom: 0;
    }
    .qr-box {
      flex: 0 0 150px;
      width: 150px;
      border: 2px solid #000;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 10px 8px;
      background: #fff;
    }
    .qr-box img {
      width: 126px;
      height: 126px;
      display: block;
      image-rendering: pixelated;
    }
    .qr-box span {
      font-family: 'Outfit', 'Manrope', sans-serif !important;
      font-size: 10px;
      font-weight: 800;
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .footer {
      text-align: center;
      padding-top: 16px;
      border-top: 1px dashed #999;
      color: #000;
      font-size: 12px;
      font-weight: 600;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #000;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      font-family: inherit;
    }
    .print-btn:hover { background: #333; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print Label</button>
  
  <div class="receipt-container">
    <div class="header">
      <div class="store-title">Nanofield</div>
    </div>
    
    <div class="receipt-body">
      ${addressHtml(
        shipping,
        "Penerima",
        true
      )}

      <div class="sender-row">
        ${addressHtml(
          nanofieldSender,
          "Pengirim",
          true
        )}
        <div class="qr-box">
          <img src="${qrCodeUrl}" alt="Scan to track order" />
          <span>Scan to track</span>
        </div>
      </div>

      <div class="footer">
        <p style="margin: 0;">Thank you for your order!</p>
        <p style="margin: 4px 0 0; font-size: 0.9em; font-weight: 500;">Nanofield &copy; ${new Date().getFullYear()}</p>
      </div>
    </div>
  </div>
</body>
</html>`
}