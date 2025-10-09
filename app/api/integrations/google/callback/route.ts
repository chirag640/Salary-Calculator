import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, getUserProfile } from '@/lib/integrations/google-calendar'
import { createIntegration, getIntegration, updateIntegrationTokens } from '@/lib/integrations/db'

// Step 2: OAuth callback handler
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('📥 Google OAuth callback received:', { code: !!code, state: !!state, error })

    if (error) {
      console.log('❌ User cancelled OAuth:', error)
      return NextResponse.redirect(
        new URL(`/profile?error=${encodeURIComponent('Google Calendar connection cancelled')}`, req.url)
      )
    }

    if (!code || !state) {
      console.log('❌ Missing code or state')
      return NextResponse.redirect(
        new URL(`/profile?error=${encodeURIComponent('Missing authorization code')}`, req.url)
      )
    }

    // Decode state. There are two possible formats used in this app:
    // 1) Integration flow: { userId, timestamp }
    // 2) Auth sign-in flow: { returnTo, nonce, timestamp }
    let stateData: any = null
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch (err) {
      console.log('❌ Failed to parse state:', err)
      return NextResponse.redirect(new URL(`/profile?error=${encodeURIComponent('Invalid state parameter')}`, req.url))
    }

    // If this looks like an auth sign-in state (contains returnTo/nonce),
    // this callback should be handled by the auth sign-in flow. Forward the
    // request to the auth callback endpoint so sign-in/account linking logic runs there.
    if (stateData && (stateData.returnTo || stateData.nonce) && !stateData.userId) {
      console.log('➡️ Detected auth-style state; forwarding to auth callback')
      // Preserve original query string (code & state & others) and redirect to auth callback
      const forwardUrl = new URL('/api/auth/google/callback', req.url)
      const params = req.nextUrl.search
      forwardUrl.search = params
      return NextResponse.redirect(forwardUrl)
    }

    const userId = stateData?.userId
    console.log('👤 User ID from state:', userId)

    if (!userId) {
      console.log('❌ Invalid state parameter (missing userId)')
      return NextResponse.redirect(
        new URL(`/profile?error=${encodeURIComponent('Invalid session')}`, req.url)
      )
    }

    // Exchange code for tokens
  console.log('🔄 Exchanging code for tokens...')
  const integrationRedirect = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
  const tokens = await exchangeCodeForTokens(code, integrationRedirect)
    console.log('✅ Tokens received')
    
    // Get user profile from Google
    console.log('👤 Fetching user profile...')
  const profile = await getUserProfile(tokens.accessToken, integrationRedirect)
    console.log('✅ Profile received:', profile.email)
    
    // Check if integration already exists
    const existingIntegration = await getIntegration(userId, 'GOOGLE_CALENDAR')
    
    if (existingIntegration) {
      // Update existing integration
      console.log('🔄 Updating existing integration...')
      await updateIntegrationTokens(
        existingIntegration._id!,
        tokens.accessToken,
        tokens.refreshToken,
        new Date(tokens.expiryDate)
      )
      console.log('✅ Integration updated')
    } else {
      // Create new integration
      console.log('➕ Creating new integration...')
      await createIntegration({
        userId,
        type: 'GOOGLE_CALENDAR',
        status: 'CONNECTED',
        displayName: `Google Calendar (${profile.email})`,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: new Date(tokens.expiryDate),
        providerUserId: profile.id,
        providerEmail: profile.email,
        providerData: {
          name: profile.name,
          picture: profile.picture,
        },
        syncEnabled: true,
        syncFrequency: 'DAILY',
        autoImport: false,
        importSettings: {
          includeAllEvents: false,
          onlyWorkEvents: true,
          keywords: ['meeting', 'call', 'sync', 'standup', 'review'],
          excludeKeywords: ['lunch', 'break', 'personal', 'birthday', 'holiday'],
          lookbackDays: 7,
          lookforwardDays: 0,
          minDuration: 15,
          onlyAcceptedEvents: true,
          roundToNearest: 15,
          includeDescription: true,
          includeAttendees: false,
        },
      })
      console.log('✅ Integration created')
    }

    // Redirect back to integrations page
    console.log('✅ Redirecting to profile page')
    return NextResponse.redirect(
      new URL('/profile?integration=google-calendar&status=connected', req.url)
    )
  } catch (error) {
    console.error('❌ Error in Google OAuth callback:', error)
    return NextResponse.redirect(
      new URL(`/profile?error=${encodeURIComponent('Failed to connect Google Calendar')}`, req.url)
    )
  }
}
