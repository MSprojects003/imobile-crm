type ApiError = {
  error?: string
}

export async function readDashboardApiResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      `Dashboard API returned a non-JSON response (HTTP ${response.status}). ` +
        "The request may be reaching a page or rewrite instead of its API route.",
    )
  }

  let result: T & ApiError
  try {
    result = (await response.json()) as T & ApiError
  } catch {
    throw new Error(`Dashboard API returned invalid JSON (HTTP ${response.status}).`)
  }

  if (!response.ok) {
    throw new Error(result.error ?? `${fallbackMessage} (HTTP ${response.status}).`)
  }

  return result
}
