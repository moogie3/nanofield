import { Metadata } from "next"
import MidtransReturn from "@modules/order/components/midtrans-return"

export const metadata: Metadata = {
  title: "Payment Return",
  description: "Returning from Midtrans payment",
}

type Props = {
  searchParams: Promise<{
    order_id?: string
    transaction_status?: string
  }>
}

// Landing for Midtrans Snap's finish redirect (?order_id &
// ?transaction_status are appended by Snap). The cart is completed from
// here, once the payment reports settlement — see MidtransReturn.
export default async function MidtransReturnPage(props: Props) {
  const params = await props.searchParams
  return (
    <MidtransReturn
      midtransOrderId={params.order_id}
      transactionStatus={params.transaction_status}
    />
  )
}
