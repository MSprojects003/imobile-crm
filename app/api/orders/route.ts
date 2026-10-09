import "server-only"

import { NextRequest, NextResponse } from "next/server"

import { authorizeDashboardRequest } from "@/lib/admin-auth"

type JoinedOrderRow = {
  id: string
  order_id: string
  created_at: string
  shop_id: string
  user_id: string
  estimated_total: number | string
  full_total: number | string
  products_count: number
  parcels_delivered: number
  status: string
  refund_amount: number | string
  deducted_amount: number | string
  is_negotiable_price: boolean
  negotiable_reason: string | null
  shop:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null
  staff:
    | {
        id: string
        staff_id: string | null
        user_id: string | null
        user:
          { full_name: string | null } | { full_name: string | null }[] | null
      }
    | {
        id: string
        staff_id: string | null
        user_id: string | null
        user:
          { full_name: string | null } | { full_name: string | null }[] | null
      }[]
    | null
}

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(request, "viewOrders")
  if (!authorization.authorized) return authorization.response

  const pageSize = 1000
  const rows: JoinedOrderRow[] = []

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await authorization.adminClient
      .from("orders")
      .select(
        "id, order_id, created_at, shop_id, user_id, estimated_total, full_total, products_count, parcels_delivered, status, refund_amount, deducted_amount, is_negotiable_price, negotiable_reason, shop:shops!orders_shop_id_fkey(id, name), staff:staff!orders_user_id_fkey(id, staff_id, user_id, user:users!staff_user_id_fkey(full_name))"
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error("Orders list query failed", { code: error.code })
      return NextResponse.json(
        { error: "Could not load orders." },
        { status: 500 }
      )
    }

    const pageRows = (data ?? []) as unknown as JoinedOrderRow[]
    rows.push(...pageRows)
    if (pageRows.length < pageSize) break
  }

  const orders = rows.map((row) => {
    const shop = first(row.shop)
    const staff = first(row.staff)
    const profile = first(staff?.user)
    return {
      id: row.id,
      orderId: row.order_id,
      createdAt: row.created_at,
      shopId: row.shop_id,
      shopName: shop?.name?.trim() || "Shop unavailable",
      staffRecordId: row.user_id,
      staffCode: staff?.staff_id ?? "",
      staffName: profile?.full_name?.trim() || "Staff member",
      estimatedTotal: Number(row.estimated_total),
      fullTotal: Number(row.full_total),
      productsCount: row.products_count,
      parcelsDelivered: row.parcels_delivered,
      status: row.status,
      refundAmount: Number(row.refund_amount),
      deductedAmount: Number(row.deducted_amount),
      isNegotiablePrice: row.is_negotiable_price,
      negotiableReason: row.negotiable_reason,
    }
  })

  return NextResponse.json({ orders })
}
