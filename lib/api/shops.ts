import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

type ShopJoinRow = {
  id: string
  shop_id: string | null
  name: string
  owner: string
  address1: string
  area: string | null
  phone_number: string | null
  email: string | null
  is_active: boolean
  created_at: string
  staff: {
    user: {
      full_name: string
      phone: string
    } | null
  } | null
}

export async function getShops(adminClient: SupabaseClient) {
  const { data, error } = await adminClient
    .from("shops")
    .select("id, shop_id, name, owner, address1, area, phone_number, email, is_active, created_at, staff:staff!fk_shops_created_by_staff(user:users!staff_user_id_fkey(full_name, phone))")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as ShopJoinRow[]).map((shop) => ({
    id: shop.id,
    shopId: shop.shop_id,
    name: shop.name,
    owner: shop.owner,
    address: shop.address1,
    area: shop.area,
    phone: shop.phone_number,
    email: shop.email,
    isActive: shop.is_active,
    createdAt: shop.created_at,
    staffName: shop.staff?.user?.full_name ?? "",
    staffPhone: shop.staff?.user?.phone ?? "",
  }))
}
