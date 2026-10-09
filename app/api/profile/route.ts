import "server-only"

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

import { sendNotifySms } from "@/lib/notify-lk"

const cookieName = "profile_phone_change"
const challengeLifetimeMs = 5 * 60 * 1000
const resendDelayMs = 2 * 60 * 1000
const maxOtpAttempts = 5

type PhoneChangeChallenge = {
  userId: string
  authUserId: string
  oldPhone: string
  newPhone: string
  otpHash: string
  expiresAt: number
  resendAfter: number
  attempts: number
}

function getEncryptionKey() {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) throw new Error("Missing SUPABASE_SECRET_KEY")
  return createHash("sha256").update(secret).digest()
}

function sealChallenge(challenge: PhoneChangeChallenge) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(challenge)),
    cipher.final(),
  ])
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`
}

function openChallenge(value: string | undefined): PhoneChangeChallenge | null {
  if (!value) return null
  try {
    const [ivValue, tagValue, encryptedValue] = value.split(".")
    if (!ivValue || !tagValue || !encryptedValue) return null
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivValue, "base64url")
    )
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ])
    return JSON.parse(decrypted.toString("utf8")) as PhoneChangeChallenge
  } catch {
    return null
  }
}

function setChallengeCookie(
  response: NextResponse,
  challenge: PhoneChangeChallenge
) {
  response.cookies.set(cookieName, sealChallenge(challenge), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/profile",
    maxAge: Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / 1000)),
  })
}

function clearChallengeCookie(response: NextResponse) {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/profile",
    maxAge: 0,
  })
}

function hashOtp(code: string) {
  return createHash("sha256")
    .update(`${code}:${getEncryptionKey().toString("hex")}`)
    .digest("hex")
}

function normalizePhone(phone: string) {
  const value = phone.trim()
  const digits = value.replace(/\D/g, "")
  if (value.startsWith("+")) return `+${digits}`
  if (digits.startsWith("0094")) return `+${digits.slice(2)}`
  if (digits.startsWith("94")) return `+${digits}`
  if (digits.startsWith("0")) return `+94${digits.slice(1)}`
  return `+94${digits}`
}

async function getAuthorizedContext(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) {
    return {
      response: NextResponse.json(
        { error: "Sign in is required." },
        { status: 401 }
      ),
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return {
      response: NextResponse.json(
        { error: "Supabase is not configured on the server." },
        { status: 500 }
      ),
    }
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } =
    await authClient.auth.getUser(token)
  if (authError || !authData.user?.phone) {
    return {
      response: NextResponse.json(
        { error: "Your session is invalid or has expired." },
        { status: 401 }
      ),
    }
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: users, error } = await adminClient
    .from("users")
    .select("id, phone")
    .eq("status", true)

  if (error) {
    console.error("Phone-change profile lookup failed", { code: error.code })
    return {
      response: NextResponse.json(
        { error: "Could not load your account profile." },
        { status: 500 }
      ),
    }
  }

  const profile = users?.find(
    (candidate) =>
      candidate.phone &&
      normalizePhone(candidate.phone) === normalizePhone(authData.user.phone!)
  )
  if (!profile) {
    return {
      response: NextResponse.json(
        { error: "An active account profile could not be found." },
        { status: 403 }
      ),
    }
  }

  return { authData, profile, adminClient }
}

function challengeBelongsToUser(
  challenge: PhoneChangeChallenge | null,
  context: Awaited<ReturnType<typeof getAuthorizedContext>>
): challenge is PhoneChangeChallenge {
  return Boolean(
    challenge &&
    !("response" in context) &&
    challenge.userId === context.profile.id &&
    challenge.authUserId === context.authData.user.id
  )
}

async function sendCode(phone: string, userId: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  await sendNotifySms(
    phone,
    `Your phone change verification code is ${code}. It expires in 5 minutes.`
  )

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (supabaseUrl && secretKey) {
    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error } = await adminClient.from("sms").insert({
      body: "OTP*** sent",
      user_id: userId,
      shop_id: null,
      type: "otp_sent",
    })
    if (error) {
      console.error("Phone-change OTP SMS log insert failed", {
        code: error.code,
      })
    }
  }

  return code
}

export async function POST(request: NextRequest) {
  const context = await getAuthorizedContext(request)
  if ("response" in context) return context.response

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const action = body.action
  if (action === "status") {
    const challenge = openChallenge(request.cookies.get(cookieName)?.value)
    if (
      !challengeBelongsToUser(challenge, context) ||
      challenge.expiresAt <= Date.now()
    ) {
      const response = NextResponse.json({ pending: false })
      if (challenge) clearChallengeCookie(response)
      return response
    }

    return NextResponse.json({
      pending: true,
      phone: challenge.newPhone,
      maskedPhone: `***${challenge.newPhone.slice(-4)}`,
      resendAfter: challenge.resendAfter,
    })
  }

  if (action === "send") {
    const phone = typeof body.phone === "string" ? body.phone.trim() : ""
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      return NextResponse.json(
        { error: "Enter a valid phone number with its country code." },
        { status: 400 }
      )
    }
    if (normalizePhone(phone) === normalizePhone(context.profile.phone)) {
      return NextResponse.json(
        { error: "That is already your current phone number." },
        { status: 400 }
      )
    }

    const previousChallenge = openChallenge(
      request.cookies.get(cookieName)?.value
    )
    if (
      previousChallenge &&
      previousChallenge.userId === context.profile.id &&
      normalizePhone(previousChallenge.newPhone) === normalizePhone(phone) &&
      previousChallenge.expiresAt > Date.now() &&
      previousChallenge.resendAfter > Date.now()
    ) {
      return NextResponse.json(
        { error: "A code was recently sent. Wait before requesting another." },
        { status: 429 }
      )
    }

    const { data: users, error: usersError } = await context.adminClient
      .from("users")
      .select("id, phone")
      .eq("status", true)
    if (usersError) {
      console.error("Phone-change availability check failed", {
        code: usersError.code,
      })
      return NextResponse.json(
        { error: "Could not verify the new phone number." },
        { status: 500 }
      )
    }
    const alreadyUsed = users?.some(
      (user) =>
        user.id !== context.profile.id &&
        user.phone &&
        normalizePhone(user.phone) === normalizePhone(phone)
    )
    if (alreadyUsed) {
      return NextResponse.json(
        { error: "That phone number is already linked to another account." },
        { status: 409 }
      )
    }

    let code: string
    try {
      code = await sendCode(phone, context.profile.id)
    } catch (error) {
      console.error("Phone-change OTP could not be sent", error)
      return NextResponse.json(
        { error: "Could not send the verification code. Please try again." },
        { status: 502 }
      )
    }

    const challenge: PhoneChangeChallenge = {
      userId: context.profile.id,
      authUserId: context.authData.user.id,
      oldPhone: context.profile.phone,
      newPhone: phone,
      otpHash: hashOtp(code),
      expiresAt: Date.now() + challengeLifetimeMs,
      resendAfter: Date.now() + resendDelayMs,
      attempts: 0,
    }
    const response = NextResponse.json({
      ok: true,
      maskedPhone: `***${phone.slice(-4)}`,
      resendAfter: challenge.resendAfter,
    })
    setChallengeCookie(response, challenge)
    return response
  }

  if (action === "resend") {
    const challenge = openChallenge(request.cookies.get(cookieName)?.value)
    if (
      !challengeBelongsToUser(challenge, context) ||
      challenge.expiresAt <= Date.now()
    ) {
      const response = NextResponse.json(
        {
          error: "This verification has expired. Start again.",
          restartRequired: true,
        },
        { status: 401 }
      )
      clearChallengeCookie(response)
      return response
    }
    if (challenge.resendAfter > Date.now()) {
      return NextResponse.json(
        { error: "Please wait before requesting another code." },
        { status: 429 }
      )
    }

    let code: string
    try {
      code = await sendCode(challenge.newPhone, challenge.userId)
    } catch (error) {
      console.error("Phone-change OTP resend failed", error)
      return NextResponse.json(
        { error: "Could not resend the verification code. Please try again." },
        { status: 502 }
      )
    }

    challenge.otpHash = hashOtp(code)
    challenge.expiresAt = Date.now() + challengeLifetimeMs
    challenge.resendAfter = Date.now() + resendDelayMs
    challenge.attempts = 0
    const response = NextResponse.json({
      ok: true,
      resendAfter: challenge.resendAfter,
    })
    setChallengeCookie(response, challenge)
    return response
  }

  if (action === "verify") {
    const challenge = openChallenge(request.cookies.get(cookieName)?.value)
    if (
      !challengeBelongsToUser(challenge, context) ||
      challenge.expiresAt <= Date.now()
    ) {
      const response = NextResponse.json(
        {
          error: "This verification has expired. Start again.",
          restartRequired: true,
        },
        { status: 401 }
      )
      clearChallengeCookie(response)
      return response
    }

    const code = typeof body.code === "string" ? body.code : ""
    const validCode =
      /^\d{6}$/.test(code) &&
      timingSafeEqual(
        Buffer.from(hashOtp(code), "hex"),
        Buffer.from(challenge.otpHash, "hex")
      )
    if (!validCode) {
      challenge.attempts += 1
      const tooManyAttempts = challenge.attempts >= maxOtpAttempts
      const response = NextResponse.json(
        {
          error: tooManyAttempts
            ? "Too many incorrect codes. Request a new code."
            : "That code is incorrect. Try again.",
          restartRequired: tooManyAttempts,
        },
        { status: 401 }
      )
      if (tooManyAttempts) clearChallengeCookie(response)
      else setChallengeCookie(response, challenge)
      return response
    }

    const { error: profileUpdateError } = await context.adminClient
      .from("users")
      .update({ phone: challenge.newPhone })
      .eq("id", challenge.userId)
    if (profileUpdateError) {
      console.error("Verified phone profile update failed", {
        code: profileUpdateError.code,
      })
      return NextResponse.json(
        { error: "Could not update the phone number. Please try again." },
        { status: 500 }
      )
    }

    try {
      const { error: authUpdateError } =
        await context.adminClient.auth.admin.updateUserById(
          challenge.authUserId,
          { phone: challenge.newPhone, phone_confirm: true }
        )
      if (authUpdateError) throw authUpdateError
    } catch (authUpdateError) {
      const { error: rollbackError } = await context.adminClient
        .from("users")
        .update({ phone: challenge.oldPhone })
        .eq("id", challenge.userId)
      if (rollbackError) {
        console.error("Phone profile rollback failed after Auth update error", {
          code: rollbackError.code,
        })
      }
      console.error("Verified phone Auth update failed", {
        code:
          typeof authUpdateError === "object" &&
          authUpdateError !== null &&
          "code" in authUpdateError
            ? authUpdateError.code
            : undefined,
        status:
          typeof authUpdateError === "object" &&
          authUpdateError !== null &&
          "status" in authUpdateError
            ? authUpdateError.status
            : undefined,
      })
      return NextResponse.json(
        { error: "Could not update the authenticated phone number." },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      ok: true,
      phone: challenge.newPhone,
    })
    clearChallengeCookie(response)
    return response
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 })
}
