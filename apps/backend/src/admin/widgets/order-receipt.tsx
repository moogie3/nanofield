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

      // Wait for resources to load, then print
      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        // Cleanup after print dialog closes
        setTimeout(() => {
          document.body.removeChild(iframe)
          setIsPrinting(false)
        }, 1000)
      }, 500)
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
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h2" className="text-ui-fg-base mb-1">
            Order Receipt
          </Heading>
          <Text className="text-ui-fg-subtle text-sm">
            Print a packing slip / receipt for this captured order.
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
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default OrderReceiptWidget
