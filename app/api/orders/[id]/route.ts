import "server-only"

import { NextRequest, NextResponse } from "next/server"

import { authorizeDashboardRequest } from "@/lib/admin-auth"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Related<T> = T | T[] | null

function first<T>(value: Related<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeDashboardRequest(request, "viewOrders")
  if (!authorization.authorized) return authorization.response

  const { id } = await params
  if (!uuidPattern.test(id)) {
    return NextResponse.json(
      { error: "A valid order ID is required." },
      { status: 400 }
    )
  }

  const { data: order, error: orderError } = await authorization.adminClient
    .from("orders")
    .select(
      "id, order_id, user_id, shop_id, estimated_total, products_count, full_total, is_negotiable_price, negotiable_reason, parcels_delivered, status, refund_amount, deducted_amount, created_at, shop:shops!orders_shop_id_fkey(id, shop_id, name, owner, address1, area, phone_number), staff:staff!orders_user_id_fkey(id, staff_id, user_id, user:users!staff_user_id_fkey(id, full_name, phone))"
    )
    .eq("id", id)
    .maybeSingle()

  if (orderError) {
    console.error("Order details lookup failed", {
      code: orderError.code,
      orderId: id,
    })
    return NextResponse.json(
      { error: "Could not load the order details." },
      { status: 500 }
    )
  }
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 })
  }

  const { data: itemRows, error: itemsError } = await authorization.adminClient
    .from("order_items")
    .select(
      "id, order_id, product_id, product_name, product_image, quantity, subtotal, created_at, status, product:products!order_items_product_id_fkey(id, sku, name, model_number, model, category, brand, manufactured_year, description, images, specifications, pricing_type, fixed_price, colors)"
    )
    .eq("order_id", id)
    .order("created_at", { ascending: true })

  if (itemsError) {
    console.error("Order items lookup failed", {
      code: itemsError.code,
      orderId: id,
    })
    return NextResponse.json(
      { error: "Could not load the order's products." },
      { status: 500 }
    )
  }

  const items = itemRows ?? []
  const itemIds = items.map((item) => item.id)
  let subItems: Array<{
    id: string
    order_item_id: string
    models: string[]
    colors: string[]
    quantity: number
    unit_price: number | string
    subtotal: number | string
    created_at: string
    status: string
  }> = []

  if (itemIds.length > 0) {
    const { data, error } = await authorization.adminClient
      .from("sub_order_items")
      .select(
        "id, order_item_id, models, colors, quantity, unit_price, subtotal, created_at, status"
      )
      .in("order_item_id", itemIds)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Order sub-items lookup failed", {
        code: error.code,
        orderId: id,
      })
      return NextResponse.json(
        { error: "Could not load the order's item variants." },
        { status: 500 }
      )
    }
    subItems = data ?? []
  }

  const staff = first(
    order.staff as Related<{
      id: string
      staff_id: string | null
      user_id: string | null
      user: Related<{
        id: string
        full_name: string | null
        phone: string | null
      }>
    }>
  )
  const staffProfile = first(staff?.user ?? null)
  const shop = first(
    order.shop as Related<{
      id: string
      shop_id: string | null
      name: string | null
      owner: string | null
      address1: string | null
      area: string | null
      phone_number: string | null
    }>
  )
  const subItemsByOrderItemId = new Map<string, typeof subItems>()
  for (const subItem of subItems) {
    const current = subItemsByOrderItemId.get(subItem.order_item_id) ?? []
    current.push(subItem)
    subItemsByOrderItemId.set(subItem.order_item_id, current)
  }

  return NextResponse.json({
    order: {
      id: order.id,
      orderId: order.order_id,
      createdAt: order.created_at,
      shopId: order.shop_id,
      shopName: shop?.name?.trim() || "Shop unavailable",
      staffRecordId: order.user_id,
      staffName: staffProfile?.full_name?.trim() || "Staff member",
      estimatedTotal: Number(order.estimated_total),
      productsCount: order.products_count,
      fullTotal: Number(order.full_total),
      isNegotiablePrice: order.is_negotiable_price,
      negotiableReason: order.negotiable_reason,
      parcelsDelivered: order.parcels_delivered,
      status: order.status,
      refundAmount: Number(order.refund_amount),
      deductedAmount: Number(order.deducted_amount),
      shop: shop
        ? {
            id: shop.id,
            shopId: shop.shop_id,
            name: shop.name,
            owner: shop.owner,
            address: shop.address1,
            area: shop.area,
            phone: shop.phone_number,
          }
        : null,
      staff: {
        id: order.user_id,
        staffRecordId: staff?.id ?? "",
        staffCode: staff?.staff_id ?? "",
        fullName: staffProfile?.full_name ?? "Staff member",
        phone: staffProfile?.phone ?? "",
      },
      items: items.map((item) => {
        const product = first(
          item.product as Related<{
            id: string
            sku: string | null
            name: string | null
            model_number: string | null
            model: string | null
            category: string | null
            brand: string | null
            manufactured_year: number | null
            description: string | null
            images: string[] | null
            specifications: unknown
            pricing_type: string | null
            fixed_price: number | string | null
            colors: string[] | null
          }>
        )
        return {
          id: item.id,
          productId: item.product_id,
          name: item.product_name,
          image: item.product_image ?? product?.images?.[0] ?? null,
          quantity: item.quantity,
          subtotal: Number(item.subtotal),
          createdAt: item.created_at,
          status: item.status,
          product: product
            ? {
                id: product.id,
                sku: product.sku,
                name: product.name,
                modelNumber: product.model_number,
                model: product.model,
                category: product.category,
                brand: product.brand,
                manufacturedYear: product.manufactured_year,
                description: product.description,
                images: product.images ?? [],
                specifications: product.specifications,
                pricingType: product.pricing_type,
                fixedPrice:
                  product.fixed_price === null
                    ? null
                    : Number(product.fixed_price),
                colors: product.colors ?? [],
              }
            : null,
          subItems: (subItemsByOrderItemId.get(item.id) ?? []).map(
            (subItem) => ({
              id: subItem.id,
              models: subItem.models ?? [],
              colors: subItem.colors ?? [],
              quantity: subItem.quantity,
              unitPrice: Number(subItem.unit_price),
              subtotal: Number(subItem.subtotal),
              createdAt: subItem.created_at,
              status: subItem.status,
            })
          ),
        }
      }),
    },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeDashboardRequest(request, "updateOrders")
  if (!authorization.authorized) return authorization.response

  const { id: orderId } = await params
  if (!uuidPattern.test(orderId)) {
    return NextResponse.json(
      { error: "A valid order ID is required." },
      { status: 400 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid order status update." },
      { status: 400 }
    )
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid order status update." },
      { status: 400 }
    )
  }

  const input = body as Record<string, unknown>
  if (Object.hasOwn(input, "parcelsDelivered")) {
    const parcelsDelivered = input.parcelsDelivered
    if (
      typeof parcelsDelivered !== "number" ||
      !Number.isSafeInteger(parcelsDelivered) ||
      parcelsDelivered < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Delivered parcel count must be a whole number of zero or more.",
        },
        { status: 400 }
      )
    }

    const { data: updatedOrder, error: updateError } =
      await authorization.adminClient
        .from("orders")
        .update({ parcels_delivered: parcelsDelivered })
        .eq("id", orderId)
        .select("id, parcels_delivered")
        .maybeSingle()

    if (updateError) {
      console.error("Delivered parcel count update failed", {
        code: updateError.code,
        orderId,
      })
      return NextResponse.json(
        { error: "Could not update delivered parcels." },
        { status: 500 }
      )
    }
    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }
    return NextResponse.json({
      order: {
        id: updatedOrder.id,
        parcelsDelivered: updatedOrder.parcels_delivered,
      },
    })
  }

  const status =
    typeof input.status === "string" ? input.status.toLowerCase() : ""
  const subOrderItemId =
    typeof input.subOrderItemId === "string" ? input.subOrderItemId : ""

  if (!subOrderItemId) {
    if (
      ![
        "pending",
        "accepted",
        "processing",
        "packed",
        "packing",
        "delivered",
        "rejected",
      ].includes(status)
    ) {
      return NextResponse.json(
        { error: "Choose a valid order status." },
        { status: 400 }
      )
    }

    const { data: updatedOrder, error: updateError } =
      await authorization.adminClient.rpc("update_order_status", {
        p_order_id: orderId,
        p_status: status,
      })

    if (updateError) {
      if (updateError.code === "P0002") {
        return NextResponse.json({ error: "Order not found." }, { status: 404 })
      }
      if (updateError.code === "22023") {
        return NextResponse.json(
          { error: "Choose a valid order status." },
          { status: 400 }
        )
      }
      console.error("Order status update failed", {
        code: updateError.code,
        orderId,
      })
      return NextResponse.json(
        {
          error:
            "Could not update the order status. Ensure the rejected-order refund migration has been applied.",
        },
        { status: 500 }
      )
    }
    if (!updatedOrder || typeof updatedOrder !== "object") {
      console.error("Order status update returned an invalid response", {
        orderId,
      })
      return NextResponse.json(
        { error: "Could not confirm the updated order status." },
        { status: 500 }
      )
    }

    const result = updatedOrder as {
      id?: string
      status?: string
      estimatedTotal?: number
      fullTotal?: number
      refundAmount?: number
    }
    if (!result.id || typeof result.status !== "string") {
      console.error("Order status update returned incomplete data", {
        orderId,
      })
      return NextResponse.json(
        { error: "Could not confirm the updated order status." },
        { status: 500 }
      )
    }
    return NextResponse.json({
      order: {
        id: result.id,
        status: result.status,
        estimatedTotal: result.estimatedTotal,
        fullTotal: result.fullTotal,
        refundAmount: result.refundAmount,
      },
    })
  }

  if (
    !uuidPattern.test(subOrderItemId) ||
    !["packing", "packed", "delivered", "no_items"].includes(status)
  ) {
    return NextResponse.json(
      {
        error:
          "Choose a valid sub-order item and status (packing, packed, delivered, or no items).",
      },
      { status: 400 }
    )
  }

  const { data, error } = await authorization.adminClient.rpc(
    "update_order_sub_item_status",
    {
      p_order_id: orderId,
      p_sub_order_item_id: subOrderItemId,
      p_status: status,
    }
  )

  if (error) {
    if (error.code === "P0002") {
      return NextResponse.json(
        { error: "The selected order item was not found in this order." },
        { status: 404 }
      )
    }
    if (error.code === "22023") {
      return NextResponse.json(
        { error: "Choose a valid order fulfillment status." },
        { status: 400 }
      )
    }
    if (error.code === "22003") {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Order fulfillment status update failed", {
      code: error.code,
      orderId,
      subOrderItemId,
    })
    return NextResponse.json(
      {
        error:
          "Could not update the order status. Ensure the order fulfillment status migration has been applied.",
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ status: data })
}
