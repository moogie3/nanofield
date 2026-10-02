import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Heading,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { sdk } from "../lib/sdk"

// Danger zone on the customer detail page. Medusa core exposes
// DELETE /admin/customers/:id (removeCustomerAccountWorkflow: deletes the
// customer and detaches its auth identity) but ships no dashboard button
// for it — this widget is that button. Core RBAC still gates the call, so
// Staff without delete permission get a 403 here, surfaced as a toast.
const CustomerDeleteWidget = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["nanofield-customer-delete", id],
    queryFn: () =>
      sdk.admin.customer.retrieve(id!, {
        fields: "id,email,first_name,last_name",
      }),
    enabled: !!id,
  })

  const customer = data?.customer
  const label =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    customer?.email ||
    id

  const handleDelete = async () => {
    if (!id) return
    const confirmed = await prompt({
      title: `Delete customer ${label}?`,
      description:
        "The customer record and its sign-in are permanently removed. Their orders and notification history stay for bookkeeping, and the email address can register again afterwards. This cannot be undone.",
      confirmText: "Delete forever",
      cancelText: "Keep",
    })
    if (!confirmed) {
      return
    }
    setIsDeleting(true)
    try {
      await sdk.admin.customer.delete(id)
      toast.success("Customer deleted", {
        description: `${label} was permanently removed.`,
      })
      navigate("/app/customers")
    } catch (e) {
      const err = e as { status?: number; message?: string }
      const denied =
        err?.status === 403 ||
        err?.status === 401 ||
        /forbidden|not permitted|not allowed|unauthorized/i.test(
          err?.message ?? ""
        )
      toast.error(
        denied
          ? "Not permitted — deleting customers requires the Owner role"
          : "Failed to delete customer",
        { description: err?.message }
      )
      setIsDeleting(false)
    }
  }

  if (isLoading || !customer) {
    return null
  }

  return (
    <Container className="p-4 border border-ui-border-base rounded-lg bg-ui-bg-base mt-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h2" className="text-ui-fg-base mb-1">
            Delete customer
          </Heading>
          <Text className="text-ui-fg-subtle text-sm">
            Permanently removes this customer and their sign-in. Orders and
            notification history are kept.
          </Text>
        </div>
        <Button
          variant="danger"
          onClick={handleDelete}
          isLoading={isDeleting}
        >
          Delete
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.after",
})

export default CustomerDeleteWidget
