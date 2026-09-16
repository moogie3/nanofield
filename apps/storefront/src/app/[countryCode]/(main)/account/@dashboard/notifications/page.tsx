import { Metadata } from "next"

import { listCustomerNotifications } from "@lib/data/notifications"
import { retrieveCustomer } from "@lib/data/customer"
import NotificationHistory from "@modules/account/components/notification-history"
import PageHeader from "@modules/common/components/page-header"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Notifications",
  description: "Order updates and store announcements.",
}

const PAGE_SIZE = 10
const MAX_LIMIT = 50

export default async function Notifications(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ limit?: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const limit = Math.min(
    Math.max(parseInt(searchParams.limit || "", 10) || PAGE_SIZE, PAGE_SIZE),
    MAX_LIMIT
  )

  // Login gate: guests go to the account gate instead of an empty page.
  // (The fetcher itself returns [] logged-out, so check identity first.)
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) {
    redirect(`/${params.countryCode}/account`)
  }

  // Fetch one extra to know whether a "Show more" button is needed.
  const fetched = await listCustomerNotifications(limit + 1, 0)
  const notifications = fetched.slice(0, limit)
  const hasMore = fetched.length > limit

  return (
    <div className="w-full" data-testid="notifications-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <PageHeader
          eyebrow="Account"
          title="Notifications"
          subtitle="Order updates and store announcements. Newest first."
        />
      </div>
      <div>
        <NotificationHistory
          customerId={customer.id}
          notifications={notifications}
          hasMore={hasMore}
          nextLimit={limit + PAGE_SIZE}
        />
      </div>
    </div>
  )
}
