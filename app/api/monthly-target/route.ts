import "server-only"

import { NextRequest, NextResponse } from "next/server"

import { authorizeDashboardRequest } from "@/lib/admin-auth"
import { sendNotifySms } from "@/lib/notify-lk"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const maximumAmount = 999999999999.99

type MonthlyTargetRow = {
  id: string
  staff_id: string
  month: number
  year: number
  target_amount: number | string
  achieved_amount: number | string
  created_at: string
}

function parsePeriod(searchParams: URLSearchParams) {
  const month = Number(searchParams.get("month"))
  const year = Number(searchParams.get("year"))
  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 9999
  ) {
    return null
  }
  return { month, year }
}

function getCurrentPeriod() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    month: "numeric",
    year: "numeric",
  }).formatToParts(new Date())
  return {
    month: Number(parts.find((part) => part.type === "month")?.value),
    year: Number(parts.find((part) => part.type === "year")?.value),
  }
}

function isCurrentPeriod(month: number, year: number) {
  const current = getCurrentPeriod()
  return month === current.month && year === current.year
}

async function getTargetData(
  request: NextRequest,
  staffUserId: string,
  month: number,
  year: number
) {
  const authorization = await authorizeDashboardRequest(
    request,
    "manageMonthlyTargets"
  )
  if (!authorization.authorized) {
    return { response: authorization.response }
  }

  const { data: staff, error: staffError } = await authorization.adminClient
    .from("staff")
    .select("id")
    .eq("user_id", staffUserId)
    .eq("is_deleted", false)
    .maybeSingle()

  if (staffError) {
    console.error("Monthly target staff lookup failed", {
      code: staffError.code,
    })
    return {
      response: NextResponse.json(
        { error: "Could not verify the selected staff member." },
        { status: 500 }
      ),
    }
  }
  if (!staff) {
    return {
      response: NextResponse.json(
        { error: "The selected staff member was not found." },
        { status: 404 }
      ),
    }
  }

  const { data, error } = await authorization.adminClient
    .from("monthly_targets")
    .select(
      "id, staff_id, month, year, target_amount, achieved_amount, created_at"
    )
    .eq("staff_id", staffUserId)
    .order("year", { ascending: true })
    .order("month", { ascending: true })

  if (error) {
    console.error("Monthly target lookup failed", { code: error.code })
    return {
      response: NextResponse.json(
        { error: "Could not load monthly targets." },
        { status: 500 }
      ),
    }
  }

  const targets = (data ?? []) as MonthlyTargetRow[]
  const previousBalance = targets.reduce((total, target) => {
    const isPreviousPeriod =
      target.year < year || (target.year === year && target.month < month)
    if (!isPreviousPeriod) return total
    return (
      total +
      Math.max(0, Number(target.target_amount) - Number(target.achieved_amount))
    )
  }, 0)
  const current = targets.find(
    (target) => target.year === year && target.month === month
  )

  return {
    authorization,
    previousBalance,
    current,
  }
}

export async function GET(request: NextRequest) {
  const staffUserId = request.nextUrl.searchParams.get("staffId") ?? ""
  const searchParams = request.nextUrl.searchParams
  if (searchParams.get("history") === "true") {
    const yearValue = searchParams.get("year") ?? ""
    const year = yearValue === "all" ? null : Number(yearValue)
    if (
      !uuidPattern.test(staffUserId) ||
      (year !== null && (!Number.isInteger(year) || year < 2000 || year > 9999))
    ) {
      return NextResponse.json(
        { error: "A valid staff account and target year are required." },
        { status: 400 }
      )
    }

    const authorization = await authorizeDashboardRequest(
      request,
      "manageMonthlyTargets"
    )
    if (!authorization.authorized) return authorization.response

    const { data: staff, error: staffError } = await authorization.adminClient
      .from("staff")
      .select("id")
      .eq("user_id", staffUserId)
      .eq("is_deleted", false)
      .maybeSingle()

    if (staffError) {
      console.error("Monthly target history staff lookup failed", {
        code: staffError.code,
      })
      return NextResponse.json(
        { error: "Could not verify the selected staff member." },
        { status: 500 }
      )
    }
    if (!staff) {
      return NextResponse.json(
        { error: "The selected staff member was not found." },
        { status: 404 }
      )
    }

    let historyQuery = authorization.adminClient
      .from("monthly_targets")
      .select(
        "id, staff_id, month, year, target_amount, achieved_amount, created_at"
      )
      .eq("staff_id", staffUserId)
    if (year !== null) historyQuery = historyQuery.eq("year", year)

    const { data, error } = await historyQuery
      .order("year", { ascending: false })
      .order("month", { ascending: false })

    if (error) {
      console.error("Monthly target history lookup failed", {
        code: error.code,
      })
      return NextResponse.json(
        { error: "Could not load monthly target history." },
        { status: 500 }
      )
    }

    const targets = (data ?? []) as MonthlyTargetRow[]
    return NextResponse.json({
      staffId: staffUserId,
      year: year ?? "all",
      targets: targets.map((target) => ({
        id: target.id,
        month: target.month,
        year: target.year,
        targetAmount: Number(target.target_amount),
        achievedAmount: Number(target.achieved_amount),
      })),
    })
  }

  const period = parsePeriod(request.nextUrl.searchParams)
  if (!period || !isCurrentPeriod(period.month, period.year)) {
    return NextResponse.json(
      { error: "The current month is required." },
      { status: 400 }
    )
  }

  if (!staffUserId) {
    const authorization = await authorizeDashboardRequest(
      request,
      "manageMonthlyTargets"
    )
    if (!authorization.authorized) return authorization.response

    const { data, error } = await authorization.adminClient
      .from("monthly_targets")
      .select("staff_id")
      .eq("month", period.month)
      .eq("year", period.year)

    if (error) {
      console.error("Current monthly target lookup failed", {
        code: error.code,
      })
      return NextResponse.json(
        { error: "Could not check current monthly targets." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      month: period.month,
      year: period.year,
      staffIds: [...new Set((data ?? []).map((target) => target.staff_id))],
    })
  }

  if (!uuidPattern.test(staffUserId)) {
    return NextResponse.json(
      { error: "A valid staff account is required." },
      { status: 400 }
    )
  }

  const result = await getTargetData(
    request,
    staffUserId,
    period.month,
    period.year
  )
  if ("response" in result) return result.response

  return NextResponse.json({
    month: period.month,
    year: period.year,
    previousBalance: result.previousBalance,
    currentTarget: result.current
      ? {
          id: result.current.id,
          targetAmount: Number(result.current.target_amount),
          achievedAmount: Number(result.current.achieved_amount),
        }
      : null,
  })
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeDashboardRequest(
    request,
    "manageMonthlyTargets"
  )
  if (!authorization.authorized) return authorization.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid monthly target details." },
      { status: 400 }
    )
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid monthly target details." },
      { status: 400 }
    )
  }

  const input = body as Record<string, unknown>
  const staffUserId = typeof input.staffId === "string" ? input.staffId : ""
  const month = Number(input.month)
  const year = Number(input.year)
  const monthlyAmount = Number(input.targetAmount)
  if (
    !uuidPattern.test(staffUserId) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 9999 ||
    !isCurrentPeriod(month, year) ||
    !Number.isFinite(monthlyAmount) ||
    monthlyAmount <= 0 ||
    monthlyAmount > maximumAmount
  ) {
    return NextResponse.json(
      {
        error:
          "Enter a valid staff member, the current month, and a positive target amount.",
      },
      { status: 400 }
    )
  }

  const result = await getTargetData(request, staffUserId, month, year)
  if ("response" in result) return result.response
  if (result.current) {
    return NextResponse.json(
      { error: "A target has already been added for this user this month." },
      { status: 409 }
    )
  }

  const { data: staffProfile, error: staffProfileError } =
    await result.authorization.adminClient
      .from("users")
      .select("id, full_name, phone")
      .eq("id", staffUserId)
      .maybeSingle()

  if (staffProfileError) {
    console.error("Monthly target staff profile lookup failed", {
      code: staffProfileError.code,
    })
    return NextResponse.json(
      { error: "Could not load the staff member's contact details." },
      { status: 500 }
    )
  }
  if (!staffProfile?.phone) {
    return NextResponse.json(
      { error: "The selected staff member does not have a phone number." },
      { status: 400 }
    )
  }

  const targetAmount =
    Math.round((monthlyAmount + result.previousBalance) * 100) / 100
  if (targetAmount > maximumAmount) {
    return NextResponse.json(
      {
        error:
          "The target including previous balance exceeds the allowed amount.",
      },
      { status: 400 }
    )
  }

  const { data, error } = await result.authorization.adminClient
    .from("monthly_targets")
    .insert({
      staff_id: staffUserId,
      month,
      year,
      target_amount: targetAmount,
    })
    .select("id, target_amount, achieved_amount")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A target has already been added for this user this month." },
        { status: 409 }
      )
    }
    if (error.code === "23503") {
      console.error(
        "Monthly target save failed because of a foreign key mismatch",
        {
          code: error.code,
        }
      )
      return NextResponse.json(
        {
          error:
            "The monthly_targets.staff_id foreign key must reference public.users(id). Update the table constraint and try again.",
        },
        { status: 400 }
      )
    }
    console.error("Monthly target save failed", { code: error.code })
    return NextResponse.json(
      { error: "Could not save the monthly target." },
      { status: 500 }
    )
  }

  const monthName = new Intl.DateTimeFormat("en-LK", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)))
  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  const staffName = staffProfile.full_name?.trim() || "there"
  const smsMessage =
    `Hello ${staffName}, your sales target for ${monthName} ${year} is LKR ${formatAmount(targetAmount)}` +
    (result.previousBalance > 0
      ? `, including LKR ${formatAmount(result.previousBalance)} carried forward`
      : "") +
    `. Please track your progress in the iMobile dashboard. Best wishes.`

  let smsSent = false
  let smsErrorMessage: string | undefined
  try {
    await sendNotifySms(staffProfile.phone, smsMessage)
    smsSent = true
  } catch (error) {
    smsErrorMessage =
      error instanceof Error ? error.message : "SMS delivery failed."
    console.error("Monthly target SMS delivery failed", {
      targetId: data.id,
      detail: smsErrorMessage,
    })
  }

  const { error: smsLogError } = await result.authorization.adminClient
    .from("sms")
    .insert({
      body: smsMessage,
      user_id: staffProfile.id,
      shop_id: null,
      type: "monthly_target",
    })

  if (smsLogError) {
    console.error("Monthly target SMS log insert failed", {
      code: smsLogError.code,
      targetId: data.id,
    })
  }

  const { data: adminProfiles, error: adminProfilesError } =
    await result.authorization.adminClient
      .from("users")
      .select("id")
      .eq("status", true)
      .or("is_admin.eq.true,is_sub_admin.eq.true")

  if (adminProfilesError) {
    console.error("Monthly target notification admin lookup failed", {
      code: adminProfilesError.code,
      targetId: data.id,
    })
  }

  const notificationRecipients = [
    ...new Set([
      staffProfile.id,
      result.authorization.notificationUserId,
      ...(adminProfiles ?? []).map((profile) => profile.id),
    ]),
  ]
  const { error: notificationError } = await result.authorization.adminClient
    .from("notifications")
    .insert(
      notificationRecipients.map((recipientId) => ({
        title:
          recipientId === staffProfile.id
            ? "Monthly sales target set"
            : "Monthly target assigned",
        message:
          recipientId === staffProfile.id
            ? `Your sales target for ${monthName} ${year} is ${formatAmount(monthlyAmount)} LKR. Outstanding balance from previous months: ${formatAmount(result.previousBalance)} LKR. Your total target to complete is ${formatAmount(targetAmount)} LKR. Please review your progress in the dashboard.`
            : `A sales target of ${formatAmount(targetAmount)} LKR was set for ${staffName} for ${monthName} ${year}.`,
        type: "monthly_target_set",
        from_user_id: result.authorization.notificationUserId,
        to_user_id: recipientId,
        is_to_all: false,
        is_read: false,
        content_id: data.id,
        link: "/dashboard/reps",
      }))
    )

  if (notificationError) {
    console.error("Monthly target notifications insert failed", {
      code: notificationError.code,
      targetId: data.id,
    })
  }

  return NextResponse.json({
    month,
    year,
    previousBalance: result.previousBalance,
    currentTarget: {
      id: data.id,
      targetAmount: Number(data.target_amount),
      achievedAmount: Number(data.achieved_amount),
    },
    delivery: {
      smsSent,
      smsLogged: !smsLogError,
      notificationsSent: !adminProfilesError && !notificationError,
      ...(smsErrorMessage ? { smsError: smsErrorMessage } : {}),
    },
  })
}
