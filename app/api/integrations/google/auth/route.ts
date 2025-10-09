import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import { getAuthorizationUrl } from '@/lib/integrations/google-calendar'

// Step 1: Initiate OAuth flow
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromSession(req)
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Basic env validation to give a clear error if expected vars are missing
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || process.env.NEXT_PUBLIC_APP_URL && `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`

    if (!clientId || !redirectUri) {
      console.error('❌ Missing Google OAuth configuration', { clientId: !!clientId, redirectUri: !!redirectUri })
      return NextResponse.redirect(
        new URL(`/profile?error=${encodeURIComponent('Missing Google OAuth configuration. Check GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI in .env.local')}`, req.url)
      )
    }

    // Encrypt user ID as state parameter (simple base64 payload)
    const state = Buffer.from(JSON.stringify({ userId: user._id, timestamp: Date.now() })).toString('base64')

    const authUrl = getAuthorizationUrl(state)

    // Log only the start of the URL (mask sensitive parts) to avoid leaking secrets to logs
    console.log('🔗 Redirecting to Google OAuth URL (masked):', authUrl.replace(/(client_id=[^&]+)/, 'client_id=REDACTED'))

    // Redirect to Google for authentication
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('❌ Error initiating Google OAuth:', error)
    return NextResponse.redirect(
      new URL(`/profile?error=${encodeURIComponent('Failed to initiate Google Calendar connection')}`, req.url)
    )
  }
}
