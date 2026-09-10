"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export const retrieveOrder = async (id: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  // Time-capped (60s): admin-side shipment/payment changes must surface on
  // account pages without a dev-server restart. Tags still allow instant
  // purges from server actions.
  const next = {
    ...(await getCacheOptions("orders")),
    revalidate: 60,
  }

  // Fulfillments power the shipment status line; fall back to the base set
  // if the backend ever rejects them so this page still renders.
  const RICH_FIELDS =
    "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product,*fulfillments"
  const BASE_FIELDS =
    "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product"

  const fetchOrder = (fields: string) =>
    sdk.client
      .fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
        method: "GET",
        query: {
          fields,
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ order }) => order)

  try {
    return await fetchOrder(RICH_FIELDS)
  } catch {
    return await fetchOrder(BASE_FIELDS).catch((err) => medusaError(err))
  }
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, unknown>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  // Same 60s cap as retrieveOrder: shipment/payment state converges
  // without restarts.
  const next = {
    ...(await getCacheOptions("orders")),
    revalidate: 60,
  }

  // Rich card fields (addresses, courier, fulfillments, payments). If the
  // backend ever rejects them, fall back to the base set so the page still
  // renders — OrderCard degrades to neutral chips when relations are absent.
  const RICH_FIELDS =
    "*items,+items.metadata,*items.variant,*items.product,*shipping_address,*shipping_methods,*fulfillments,*payment_collections,*payment_collections.payments"
  const BASE_FIELDS = "*items,+items.metadata,*items.variant,*items.product"

  const fetchOrders = (fields: string) =>
    sdk.client
      .fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
        method: "GET",
        query: {
          limit,
          offset,
          order: "-created_at",
          fields,
          ...filters,
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ orders }) => orders)

  try {
    return await fetchOrders(RICH_FIELDS)
  } catch {
    return await fetchOrders(BASE_FIELDS).catch((err) => medusaError(err))
  }
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}
