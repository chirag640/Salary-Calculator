import { type NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { google } from "googleapis"
import { generateOAuthState, isValidRedirectUrl } from "@/lib/validation/auth"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const returnTo = url.searchParams.get("returnTo") || "/"
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"

    // Validate returnTo URL to prevent open redirect
    const allowedOrigins = [baseUrl]
    if (!isValidRedirectUrl(returnTo, allowedOrigins)) {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_redirect`)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    // Use a dedicated redirect for auth sign-in flows if configured. Prefer
    // the app's built-in auth callback URL by default so that a globally-set
    // `GOOGLE_REDIRECT_URI` (commonly used for integrations) does not hijack
    // the sign-in flow. The explicit env var `GOOGLE_AUTH_REDIRECT_URI` still
    // overrides everything.
    const redirectUri =
      process.env.GOOGLE_AUTH_REDIRECT_URI ||
      (process.env.NEXT_PUBLIC_APP_URL && `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`) ||
      process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("Missing Google OAuth configuration for auth", {
        clientId: !!clientId,
        clientSecret: !!clientSecret,
        redirectUri: !!redirectUri,
      })
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent("Missing Google OAuth configuration")}`)
    }

    // Generate secure state with CSRF protection
    const state = generateOAuthState({ returnTo })

    // Create OAuth2 client for sign-in
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
      state,
      prompt: "select_account",
      include_granted_scopes: true,
    })

    console.log("Redirecting to Google OAuth (auth):", authUrl.replace(/(client_id=[^&]+)/, "client_id=REDACTED"))
    return NextResponse.redirect(authUrl)
  } catch (err) {
    console.error("Error initiating Google auth:", err)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_init_failed`)
  }
}

