import { retrieveCustomer } from "@lib/data/customer"
import { listCustomerNotifications } from "@lib/data/notifications"
import NotificationBell from "../notification-bell"

// Login gate for the navbar bell: guests get nothing (null), customers get
// the bell seeded with their latest feed rows. Failures resolve to null —
// the navbar must render with or without the bell.
export default async function NotificationButton() {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    return null
  }

  const feed = await listCustomerNotifications(20, 0)

  return <NotificationBell customerId={customer.id} initial={feed.notifications} />
}
