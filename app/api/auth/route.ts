import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const challengeCookie = "pending_login"
const challengeLifetimeMs = 5 * 60 * 1000
const resendDelayMs = 2 * 60 * 1000
const maxOtpAttempts = 5

type LoginChallenge = {
  purpose: "login" | "password-reset"
  accessToken?: string
  refreshToken?: string
  phone: string
  otpHash: string
  expiresAt: number
  resendAfter: number
  attempts: number
  verifiedAt?: number
  profile?: {
    fullName: string
    username: string
  }
}

function getEncryptionKey() {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) throw new Error("Missing SUPABASE_SECRET_KEY")
  return createHash("sha256").update(secret).digest()
}

function sealChallenge(challenge: LoginChallenge) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(challenge)), cipher.final()])
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`
}

function openChallenge(value: string | undefined): LoginChallenge | null {
  if (!value) return null

  try {
    const [ivValue, tagValue, encryptedValue] = value.split(".")
    if (!ivValue || !tagValue || !encryptedValue) return null
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"))
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ])
    return JSON.parse(decrypted.toString("utf8")) as LoginChallenge
  } catch {
    return null
  }
}

function setChallengeCookie(response: NextResponse, challenge: LoginChallenge) {
  response.cookies.set(challengeCookie, sealChallenge(challenge), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / 1000)),
  })
}

function clearChallengeCookie(response: NextResponse) {
  response.cookies.set(challengeCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 0,
  })
}

function hashOtp(code: string) {
  return createHash("sha256").update(`${code}:${getEncryptionKey().toString("hex")}`).digest("hex")
}

function normalizeSriLankanPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("0094")) return `+${digits.slice(2)}`
  if (digits.startsWith("94")) return `+${digits}`
  if (digits.startsWith("0")) return `+94${digits.slice(1)}`
  return `+94${digits}`
}

async function sendOtp(phone: string, code: string) {
  const { NOTIFY_LK_API_KEY, NOTIFY_LK_USER_ID, NOTIFY_LK_SENDER_ID } = process.env
  if (!NOTIFY_LK_API_KEY || !NOTIFY_LK_USER_ID || !NOTIFY_LK_SENDER_ID) {
    throw new Error("Notify.lk is not configured")
  }

  const response = await fetch("https://app.notify.lk/api/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      user_id: NOTIFY_LK_USER_ID,
      api_key: NOTIFY_LK_API_KEY,
      sender_id: NOTIFY_LK_SENDER_ID,
      to: phone.replace(/\D/g, ""),
      message: `Your verification code is ${code}. It expires in 5 minutes.`,
    }),
    cache: "no-store",
  })

  const responseText = await response.text()
  let result: { status?: string } | null = null
  try {
    result = JSON.parse(responseText) as { status?: string }
  } catch {
    // Some SMS gateways return plain text on success.
  }

  if (!response.ok || (result?.status && result.status.toLowerCase() !== "success")) {
    throw new Error("Notify.lk could not send the verification code")
  }
}

async function findAuthUserIdByPhone(phone: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !secretKey) throw new Error("Supabase is not configured")

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  for (let page = 1; ; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error("Unable to find the Supabase Auth account")
    const normalizedPhone = normalizeSriLankanPhone(phone)
    const authUser = data.users.find((user) => user.phone && normalizeSriLankanPhone(user.phone) === normalizedPhone)
    if (authUser) return authUser.id
    if (data.users.length < 1000) return null
  }
}

function hasValidProvisioningKey(request: NextRequest) {
  const expectedKey = process.env.ADMIN_USER_PROVISIONING_KEY
  if (!expectedKey) return null

  const authorization = request.headers.get("authorization") ?? ""
  const suppliedKey = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""
  const expectedBuffer = Buffer.from(expectedKey)
  const suppliedBuffer = Buffer.from(suppliedKey)

  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}

async function provisionAdminUser(request: NextRequest, body: Record<string, unknown>) {
  const isAuthorized = hasValidProvisioningKey(request)
  if (isAuthorized === null) {
    return NextResponse.json({ error: "Admin user provisioning is not configured." }, { status: 503 })
  }
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const username = typeof body.username === "string" ? body.username.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!username || password.length < 8) {
    return NextResponse.json({ error: "Provide an admin username and a password of at least 8 characters." }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 500 })
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile, error: profileError } = await adminClient
    .from("users")
    .select("username, phone, is_admin, status")
    .eq("username", username)
    .eq("status", true)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: "Unable to check this account right now." }, { status: 500 })
  }
  if (!profile) {
    return NextResponse.json({ error: "No active user profile exists for that username." }, { status: 404 })
  }
  if (!profile.is_admin) {
    return NextResponse.json({ error: "Only an active admin profile can be provisioned by this endpoint." }, { status: 403 })
  }

  const phone = normalizeSriLankanPhone(profile.phone)
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json({ error: "The admin profile does not have a valid phone number." }, { status: 400 })
  }

  let authUserId: string | null
  try {
    authUserId = await findAuthUserIdByPhone(phone)
  } catch {
    return NextResponse.json({ error: "Could not locate the phone account in Supabase Auth." }, { status: 500 })
  }

  if (authUserId) {
    const { error } = await adminClient.auth.admin.updateUserById(authUserId, {
      password,
      phone,
      phone_confirm: true,
    })
    if (error) {
      console.error("Admin Auth user update failed", { code: error.code, status: error.status })
      return NextResponse.json({ error: "Could not update the Supabase Auth user." }, { status: 500 })
    }
  } else {
    const { error } = await adminClient.auth.admin.createUser({
      phone,
      password,
      phone_confirm: true,
      user_metadata: { username, role: "admin" },
    })
    if (error) {
      console.error("Admin Auth user creation failed", { code: error.code, status: error.status })
      return NextResponse.json({ error: "Could not create the Supabase Auth user." }, { status: 500 })
    }
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: verificationError } = await authClient.auth.signInWithPassword({ phone, password })
  if (verificationError) {
    console.error("Provisioned admin phone sign-in verification failed", {
      code: verificationError.code,
      status: verificationError.status,
    })
    return NextResponse.json({ error: "The Auth user was updated, but Supabase could not verify phone sign-in." }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    username,
    phone: `***${phone.slice(-4)}`,
    verified: true,
  })
}

async function startLogin(body: Record<string, unknown>) {
  const username = typeof body.username === "string" ? body.username.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!username || !password) return NextResponse.json({ error: "Enter your username and password." }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 500 })
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile, error: profileError } = await adminClient
    .from("users")
    .select("full_name, username, phone, is_admin, is_sub_admin")
    .eq("username", username)
    .eq("status", true)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: "Unable to check this account right now." }, { status: 500 })
  }
  if (!profile) return NextResponse.json({ error: "Username or password is incorrect." }, { status: 401 })
  if (!profile.is_admin && !profile.is_sub_admin) {
    return NextResponse.json({ error: "This account does not have admin access." }, { status: 403 })
  }
  const phone = normalizeSriLankanPhone(profile.phone)

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await authClient.auth.signInWithPassword({ phone, password })
  if (error || !data.session) {
    if (error) console.error("Supabase phone sign-in failed", { code: error.code, status: error.status })
    const message = error?.code === "phone_provider_disabled"
      ? "Phone sign-in is disabled in Supabase Auth. Enable the Phone provider, then try again."
      : error?.code === "invalid_credentials"
        ? "Supabase could not match this phone and password. Confirm the phone Auth user exists and that you used the password set in the final reset step."
        : `Supabase rejected phone sign-in (code: ${error?.code ?? "unknown"}, HTTP ${error?.status ?? "unknown"}).`
    return NextResponse.json(
      { error: message },
      { status: 401 },
    )
  }

  if (!profile.is_admin && profile.is_sub_admin) {
    return NextResponse.json({
      requiresOtp: false,
      session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    })
  }

  const code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0")
  try {
    await sendOtp(phone, code)
  } catch {
    return NextResponse.json({ error: "Could not send the verification code. Please try again." }, { status: 502 })
  }

  const challenge: LoginChallenge = {
    purpose: "login",
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    phone,
    otpHash: hashOtp(code),
    expiresAt: Date.now() + challengeLifetimeMs,
    resendAfter: Date.now() + resendDelayMs,
    attempts: 0,
    profile: { fullName: profile.full_name, username: profile.username },
  }
  const response = NextResponse.json({ requiresOtp: true, phone: `***${phone.slice(-4)}` })
  setChallengeCookie(response, challenge)
  return response
}

async function startPasswordReset(body: Record<string, unknown>) {
  const phone = typeof body.phone === "string" ? body.phone.trim() : ""
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 500 })
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile, error } = await adminClient
    .from("users")
    .select("full_name, phone")
    .eq("phone", phone)
    .eq("status", true)
    .maybeSingle()

  if (error || !profile) {
    return NextResponse.json({ error: "No active account was found for that phone number." }, { status: 404 })
  }
  const normalizedPhone = normalizeSriLankanPhone(profile.phone)

  const code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0")
  try {
    await sendOtp(normalizedPhone, code)
  } catch {
    return NextResponse.json({ error: "Could not send the verification code. Please try again." }, { status: 502 })
  }

  const challenge: LoginChallenge = {
    purpose: "password-reset",
    phone: normalizedPhone,
    otpHash: hashOtp(code),
    expiresAt: Date.now() + challengeLifetimeMs,
    resendAfter: Date.now() + resendDelayMs,
    attempts: 0,
  }
  const response = NextResponse.json({ phone: `***${normalizedPhone.slice(-4)}`, name: profile.full_name })
  setChallengeCookie(response, challenge)
  return response
}

async function resendOtp(request: NextRequest) {
  const challenge = openChallenge(request.cookies.get(challengeCookie)?.value)
  if (!challenge || challenge.expiresAt <= Date.now()) {
    const response = NextResponse.json({ error: "This verification has expired. Please sign in again." }, { status: 401 })
    clearChallengeCookie(response)
    return response
  }
  if (challenge.resendAfter > Date.now()) {
    return NextResponse.json({ error: "Please wait before requesting another code." }, { status: 429 })
  }

  const code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0")
  try {
    await sendOtp(challenge.phone, code)
  } catch {
    return NextResponse.json({ error: "Could not send the verification code. Please try again." }, { status: 502 })
  }

  challenge.otpHash = hashOtp(code)
  challenge.expiresAt = Date.now() + challengeLifetimeMs
  challenge.resendAfter = Date.now() + resendDelayMs
  challenge.attempts = 0
  challenge.verifiedAt = undefined
  const response = NextResponse.json({ ok: true })
  setChallengeCookie(response, challenge)
  return response
}

async function verifyOtp(request: NextRequest, body: Record<string, unknown>) {
  const challenge = openChallenge(request.cookies.get(challengeCookie)?.value)
  if (!challenge || challenge.expiresAt <= Date.now()) {
    const response = NextResponse.json({ error: "This verification has expired. Please sign in again." }, { status: 401 })
    clearChallengeCookie(response)
    return response
  }

  const code = typeof body.code === "string" ? body.code : ""
  const suppliedHash = Buffer.from(hashOtp(code), "hex")
  const expectedHash = Buffer.from(challenge.otpHash, "hex")
  if (!/^\d{6}$/.test(code) || !timingSafeEqual(suppliedHash, expectedHash)) {
    challenge.attempts += 1
    const response = NextResponse.json(
      { error: challenge.attempts >= maxOtpAttempts ? "Too many incorrect codes. Sign in again." : "That code is incorrect. Try again." },
      { status: 401 },
    )
    if (challenge.attempts >= maxOtpAttempts) clearChallengeCookie(response)
    else setChallengeCookie(response, challenge)
    return response
  }

  if (challenge.purpose === "password-reset") {
    challenge.verifiedAt = Date.now()
    const response = NextResponse.json({ ok: true })
    setChallengeCookie(response, challenge)
    return response
  }

  if (!challenge.accessToken || !challenge.refreshToken) {
    const response = NextResponse.json({ error: "This verification has expired. Please sign in again." }, { status: 401 })
    clearChallengeCookie(response)
    return response
  }

  const response = NextResponse.json({
    session: { access_token: challenge.accessToken, refresh_token: challenge.refreshToken },
    profile: challenge.profile,
  })
  clearChallengeCookie(response)
  return response
}

async function completePasswordReset(request: NextRequest, body: Record<string, unknown>) {
  const challenge = openChallenge(request.cookies.get(challengeCookie)?.value)
  if (
    !challenge ||
    challenge.purpose !== "password-reset" ||
    !challenge.verifiedAt ||
    challenge.expiresAt <= Date.now()
  ) {
    const response = NextResponse.json({ error: "Verify your phone number again before resetting your password." }, { status: 401 })
    clearChallengeCookie(response)
    return response
  }

  const newPassword = typeof body.newPassword === "string" ? body.newPassword : ""
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 500 })
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let authUserId: string | null
  try {
    authUserId = await findAuthUserIdByPhone(challenge.phone)
  } catch {
    return NextResponse.json({ error: "Could not locate the phone account in Supabase Auth." }, { status: 500 })
  }

  if (authUserId) {
    const { error } = await adminClient.auth.admin.updateUserById(authUserId, {
      password: newPassword,
      phone: normalizeSriLankanPhone(challenge.phone),
      phone_confirm: true,
    })
    if (error) {
      return NextResponse.json({ error: "Could not update the password. Please try again." }, { status: 500 })
    }
  } else {
    const { error } = await adminClient.auth.admin.createUser({
      phone: normalizeSriLankanPhone(challenge.phone),
      password: newPassword,
      phone_confirm: true,
    })
    if (error) {
      console.error("Supabase phone user creation failed", { code: error.code, status: error.status })
      const message = error.code === "phone_provider_disabled"
        ? "Supabase Phone sign-in is disabled. Enable the Phone provider and configure an SMS provider or Send SMS Hook in Supabase Auth settings."
        : error.code === "phone_exists"
          ? "This phone already exists in Supabase Auth. Check the Auth Users list and make the phone formats match exactly."
          : error.code === "weak_password"
            ? "Supabase rejected this password. Choose one that meets your Auth password policy."
            : `Supabase could not create this phone user (error code: ${error.code ?? "unknown"}, HTTP ${error.status}).`
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: verificationError } = await authClient.auth.signInWithPassword({
    phone: normalizeSriLankanPhone(challenge.phone),
    password: newPassword,
  })
  if (verificationError) {
    console.error("Password reset sign-in verification failed", {
      code: verificationError.code,
      status: verificationError.status,
    })
    return NextResponse.json({ error: "The password was updated, but Supabase could not verify phone sign-in. Please contact an administrator." }, { status: 500 })
  }

  const response = NextResponse.json({ ok: true })
  clearChallengeCookie(response)
  return response
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if (body.action === "provision-admin") return provisionAdminUser(request, body)
  if (body.action === "start") return startLogin(body)
  if (body.action === "reset-start") return startPasswordReset(body)
  if (body.action === "verify") return verifyOtp(request, body)
  if (body.action === "resend") return resendOtp(request)
  if (body.action === "reset-complete") return completePasswordReset(request, body)
  if (body.action === "cancel") {
    const response = NextResponse.json({ ok: true })
    clearChallengeCookie(response)
    return response
  }
  return NextResponse.json({ error: "Invalid request." }, { status: 400 })
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 500 })
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user?.phone) {
    return NextResponse.json({ error: "Your session is invalid or has expired." }, { status: 401 })
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profiles, error: profileError } = await adminClient
    .from("users")
    .select("full_name, username, phone, profile_image_url, is_admin, is_sub_admin")
    .eq("status", true)
    .or("is_admin.eq.true,is_sub_admin.eq.true")

  if (profileError) {
    return NextResponse.json({ error: "Could not load your account profile." }, { status: 500 })
  }

  const normalizedAuthPhone = normalizeSriLankanPhone(authData.user.phone)
  const profile = profiles?.find((candidate) =>
    candidate.phone &&
    (candidate.is_admin || candidate.is_sub_admin) &&
    normalizeSriLankanPhone(candidate.phone) === normalizedAuthPhone
  )

  if (!profile) {
    return NextResponse.json({ error: "An active account profile could not be found." }, { status: 403 })
  }

  return NextResponse.json({
    profile: {
      fullName: profile.full_name,
      username: profile.username,
      phone: profile.phone,
      imageUrl: profile.profile_image_url,
      isAdmin: Boolean(profile.is_admin),
      isSubAdmin: Boolean(profile.is_sub_admin),
    },
  })
}