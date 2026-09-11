import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { sdk } from "../lib/sdk"

const OrderReceiptWidget = () => {
  const { id } = useParams()
  const [isPrinting, setIsPrinting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["nanofield-order-receipt", id],
    queryFn: () =>
      sdk.admin.order.retrieve(id!, { fields: "id,payment_status" }),
    enabled: !!id,
  })

  const order = data?.order
  const isPaid = order?.payment_status === "captured" || order?.payment_status === "paid"

  // Assuming storefront order tracking URL format
  const trackingUrl = `https://nanofield.com/order/${id}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`

  const handlePrint = async () => {
    if (!id) return
    setIsPrinting(true)
    try {
      // Fetch the receipt HTML using native fetch so cookies are sent
      // and we can easily get the text content without SDK json parsing
      const response = await fetch(`/admin/orders/${id}/receipt`, {
        method: "GET",
        headers: {
          Accept: "text/html",
        },
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${await response.text()}`)
      }

      const html = await response.text()

      // Create a hidden iframe
      const iframe = document.createElement("iframe")
      iframe.style.display = "none"
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentWindow?.document
      if (!iframeDoc) {
        throw new Error("Could not create print frame")
      }

      iframeDoc.open()
      iframeDoc.write(html as string)
      iframeDoc.close()

      // Wait for fonts and images to load before opening print dialog
      const contentWindow = iframe.contentWindow
      if (contentWindow) {
        contentWindow.document.fonts.ready.then(() => {
          // Wait for all images (like the QR code) to finish downloading
          const images = Array.from(contentWindow.document.images)
          const imagePromises = images.map(img => {
            if (img.complete) return Promise.resolve()
            return new Promise(resolve => {
              img.onload = resolve
              img.onerror = resolve
            })
          })

          Promise.all(imagePromises).then(() => {
            setTimeout(() => {
              contentWindow.focus()
              contentWindow.print()
              // Cleanup after print dialog closes
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe)
                }
                setIsPrinting(false)
              }, 1000)
            }, 100) // Small padding after load
          })
        })
      }
    } catch (e) {
      toast.error("Failed to load receipt", {
        description: (e as Error).message,
      })
      setIsPrinting(false)
    }
  }

  if (isLoading || !order) {
    return null
  }

  if (!isPaid) {
    return null
  }

  return (
    <Container className="p-4 border border-ui-border-base rounded-lg bg-ui-bg-base mt-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Heading level="h2" className="text-ui-fg-base mb-1">
            Order Receipt
          </Heading>
          <Text className="text-ui-fg-subtle text-sm">
            Print a shipping label for this captured order.
          </Text>
        </div>
        <Button 
          variant="secondary" 
          onClick={handlePrint} 
          isLoading={isPrinting}
        >
          Print Receipt
        </Button>
      </div>
      
      <div className="flex items-center gap-4 p-3 bg-ui-bg-subtle rounded-md border border-ui-border-base">
        <img src={qrCodeUrl} alt="Order QR Code" className="w-16 h-16 rounded-md" />
        <div>
          <Text className="text-ui-fg-base text-sm font-medium mb-0.5">Tracking QR Code</Text>
          <Text className="text-ui-fg-subtle text-xs">
            Scan to view this order on the storefront. This code will also be printed on the shipping label.
          </Text>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default OrderReceiptWidget
