export type DashboardRole = "admin" | "sub_admin"

export const dashboardActions = [
  "viewDashboard",
  "viewStaff",
  "addStaff",
  "updateStaff",
  "viewProducts",
  "addProducts",
  "editProducts",
  "addCategory",
  "addBrands",
  "viewShops",
  "updateShops",
  "viewNotifications",
  "assignWork",
] as const

export type DashboardAction = (typeof dashboardActions)[number]

export const ADMIN_ONLY_ACTION_MESSAGE = "Only an admin can access this action."

/**
 * Flip any value here to grant or revoke a Sub Admin capability.
 * Admins always have every action.
 */
export const subAdminLimits: Record<DashboardAction, boolean> = {
  viewDashboard: true,
  viewStaff: true,
  addStaff: false,
  updateStaff: false,
  viewProducts: true,
  addProducts: false,
  editProducts: false,
  addCategory: true,
  addBrands: true,
  viewShops: true,
  updateShops: false,
  viewNotifications: true,
  assignWork: false,
}

export function getDashboardRole(flags: {
  isAdmin: boolean
  isSubAdmin: boolean
}): DashboardRole | null {
  if (flags.isAdmin) return "admin"
  if (flags.isSubAdmin) return "sub_admin"
  return null
}

export function canPerformDashboardAction(
  role: DashboardRole | null | undefined,
  action: DashboardAction,
) {
  if (role === "admin") return true
  if (role === "sub_admin") return subAdminLimits[action]
  return false
}

export function truncatePhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.length <= 4) return phone || "—"
  return `***${digits.slice(-4)}`
}
