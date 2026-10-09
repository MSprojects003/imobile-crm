import { notFound } from "next/navigation"

import { OrderDetails } from "@/components/custom/dashboard/orders/details"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!uuidPattern.test(id)) notFound()
  return <OrderDetails orderId={id} />
}
