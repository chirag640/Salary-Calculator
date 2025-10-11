export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const params = new URLSearchParams()
  params.append('code', code)
  params.append('client_id', process.env.GOOGLE_CLIENT_ID || '')
  params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET || '')
  params.append('redirect_uri', redirectUri)
  params.append('grant_type', 'authorization_code')

  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  const data = await res.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiryDate: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  }
}

export async function getUserProfile(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch user profile')
  return await res.json()
}

export async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams()
  params.append('client_id', process.env.GOOGLE_CLIENT_ID || '')
  params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET || '')
  params.append('refresh_token', refreshToken)
  params.append('grant_type', 'refresh_token')

  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params })
  if (!res.ok) throw new Error(`Refresh token failed: ${res.status}`)
  const data = await res.json()
  return { accessToken: data.access_token, expiryDate: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined }
}
