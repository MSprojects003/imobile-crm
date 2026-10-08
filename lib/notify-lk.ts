import "server-only"

export async function sendNotifySms(phone: string, message: string) {
  const { NOTIFY_LK_API_KEY, NOTIFY_LK_USER_ID, NOTIFY_LK_SENDER_ID } = process.env
  if (!NOTIFY_LK_API_KEY || !NOTIFY_LK_USER_ID || !NOTIFY_LK_SENDER_ID) {
    throw new Error("Notify.lk is not configured.")
  }

  const response = await fetch("https://app.notify.lk/api/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      user_id: NOTIFY_LK_USER_ID,
      api_key: NOTIFY_LK_API_KEY,
      sender_id: NOTIFY_LK_SENDER_ID,
      to: phone.replace(/\D/g, ""),
      message,
    }),
    cache: "no-store",
  })
  const responseText = await response.text()
  let result: { status?: string; message?: string } | null = null
  try {
    result = JSON.parse(responseText) as { status?: string; message?: string }
  } catch {
    // Notify.lk may return plain text on success.
  }

  if (!response.ok || (result?.status && result.status.toLowerCase() !== "success")) {
    throw new Error(result?.message ?? `Notify.lk could not send the SMS (HTTP ${response.status}).`)
  }
}
