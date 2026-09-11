import { Metadata } from "next"

import OrderOverview from "@modules/account/components/order-overview"
import PageHeader from "@modules/common/components/page-header"
import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"
import Divider from "@modules/common/components/divider"
import TransferRequestForm from "@modules/account/components/transfer-request-form"

export const metadata: Metadata = {
  title: "Orders",
  description: "Overview of your previous orders.",
}

const PAGE_SIZE = 5
const MAX_LIMIT = 50

export default async function Orders(props: {
  searchParams: Promise<{ limit?: string }>
}) {
  const searchParams = await props.searchParams
  const limit = Math.min(
    Math.max(parseInt(searchParams.limit || "", 10) || PAGE_SIZE, PAGE_SIZE),
    MAX_LIMIT
  )

  // Fetch one extra to know whether a "Show more" button is needed.
  const fetched = await listOrders(limit + 1, 0)

  if (!fetched) {
    notFound()
  }

  const orders = fetched.slice(0, limit)
  const hasMore = fetched.length > limit

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <PageHeader
          eyebrow="Account"
          title="Orders"
          subtitle="View your previous orders and their status. You can also create returns or exchanges for your orders if needed."
        />
      </div>
      <div>
        <OrderOverview
          orders={orders}
          hasMore={hasMore}
          nextLimit={limit + PAGE_SIZE}
        />
        <Divider className="mb-8 mt-8" />
        <TransferRequestForm />
      </div>
    </div>
  )
}
