"use client"

import { supabase } from "@/lib/supabase"

export type OrderRecord = {
  id: string
  orderId: string
  createdAt: string
  shopId: string
  shopName: string
  staffRecordId: string
  staffCode: string
  staffName: string
  estimatedTotal: number
  fullTotal: number
  productsCount: number
  parcelsDelivered: number
  status: string
  refundAmount: number
  deductedAmount: number
  isNegotiablePrice: boolean
  negotiableReason: string | null
}

export type OrderDetails = OrderRecord & {
  shop: {
    id: string
    shopId: string | null
    name: string | null
    owner: string | null
    address: string | null
    area: string | null
    phone: string | null
  } | null
  staff: {
    id: string
    staffRecordId: string
    staffCode: string
    fullName: string
    phone: string
  }
  items: OrderItemDetails[]
}

export type OrderItemDetails = {
  id: string
  productId: string
  name: string
  image: string | null
  quantity: number
  subtotal: number
  createdAt: string
  status: string
  product: {
    id: string
    sku: string | null
    name: string | null
    modelNumber: string | null
    model: string | null
    category: string | null
    brand: string | null
    manufacturedYear: number | null
    description: string | null
    images: string[]
    specifications: unknown
    pricingType: string | null
    fixedPrice: number | null
    colors: string[]
  } | null
  subItems: Array<{
    id: string
    models: string[]
    colors: string[]
    quantity: number
    unitPrice: number
    subtotal: number
    createdAt: string
    status: string
  }>
}

export type OrderFulfillmentStatus =
  "pending" | "processing" | "packing" | "packed" | "delivered" | "no_items"
export type OrderStatus =
  | "pending"
  | "accepted"
  | "processing"
  | "packed"
  | "packing"
  | "delivered"
  | "rejected"

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    throw new Error("Your session expired. Please sign in again.")
  }
  return data.session.access_token
}

export async function fetchOrders(): Promise<OrderRecord[]> {
  const accessToken = await getAccessToken()
  const response = await fetch("/api/orders", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  const result = (await response.json()) as {
    orders?: OrderRecord[]
    error?: string
  }

  if (!response.ok || !Array.isArray(result.orders)) {
    throw new Error(result.error ?? "Could not load orders.")
  }

  return result.orders
}

export async function fetchOrderDetails(id: string): Promise<OrderDetails> {
  const accessToken = await getAccessToken()
  const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  const result = (await response.json()) as {
    order?: OrderDetails
    error?: string
  }

  if (!response.ok || !result.order) {
    throw new Error(result.error ?? "Could not load order details.")
  }
  return result.order
}

export async function updateOrderSubItemStatus(input: {
  orderId: string
  subOrderItemId: string
  status: OrderFulfillmentStatus
}) {
  const accessToken = await getAccessToken()
  const response = await fetch(
    `/api/orders/${encodeURIComponent(input.orderId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subOrderItemId: input.subOrderItemId,
        status: input.status,
      }),
    }
  )
  const result = (await response.json()) as {
    status?: {
      orderStatus: OrderStatus
      orderItemStatus: OrderFulfillmentStatus
      subOrderItemStatus: OrderFulfillmentStatus
      refundAmount: number
      fullTotal: number
    }
    error?: string
  }

  if (!response.ok || !result.status) {
    throw new Error(result.error ?? "Could not update the order status.")
  }
  return result.status
}

export async function updateOrderStatus(input: {
  orderId: string
  status: OrderStatus
}) {
  const accessToken = await getAccessToken()
  const response = await fetch(
    `/api/orders/${encodeURIComponent(input.orderId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: input.status }),
    }
  )
  const result = (await response.json()) as {
    order?: { id: string; status: OrderStatus }
    error?: string
  }

  if (!response.ok || !result.order) {
    throw new Error(result.error ?? "Could not update the order status.")
  }
  return result.order
}

export async function updateOrderParcelsDelivered(input: {
  orderId: string
  parcelsDelivered: number
}) {
  const accessToken = await getAccessToken()
  const response = await fetch(
    `/api/orders/${encodeURIComponent(input.orderId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parcelsDelivered: input.parcelsDelivered }),
    }
  )
  const result = (await response.json()) as {
    order?: { id: string; parcelsDelivered: number }
    error?: string
  }

  if (!response.ok || !result.order) {
    throw new Error(result.error ?? "Could not update delivered parcels.")
  }
  return result.order
}
