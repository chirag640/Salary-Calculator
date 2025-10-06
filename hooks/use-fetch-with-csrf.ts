"use client"
import { useCallback } from "react"
import { useCsrfToken } from "./use-csrf"

type FetchWithCsrfOptions = RequestInit & {
  retryOn403?: boolean
}

/**
 * Hook returning a fetch wrapper that automatically attaches CSRF token (double-submit)
 * and credentials. On a 403 it will attempt one refresh+retry by default.
 */
export function useFetchWithCsrf() {
  const { csrfToken, ensureCsrfToken, refreshCsrfToken } = useCsrfToken()

  const fetchWithCsrf = useCallback(async (input: RequestInfo, init?: FetchWithCsrfOptions) => {
    const opts = init || {}
    const retryOn403 = opts.retryOn403 !== false

    // ensure we include credentials by default for same-origin auth cookie
    const finalInit: RequestInit = { credentials: (opts.credentials as RequestCredentials) || 'same-origin', ...opts }

    // ensure token if we will send a mutating request
    const method = (finalInit.method || (typeof input === 'string' && input.startsWith('GET') ? 'GET' : undefined) || 'GET') as string
    let token = csrfToken
    if (/^(POST|PUT|DELETE|PATCH)$/i.test(method)) {
      token = token || await ensureCsrfToken()
      if (token) {
        finalInit.headers = {
          ...(finalInit.headers || {}),
          'x-csrf-token': token,
        }
      }
    }

    // default JSON header if body present and not set
    if (finalInit.body && !(finalInit.headers && (finalInit.headers as any)['Content-Type'])) {
      finalInit.headers = { ...(finalInit.headers || {}), 'Content-Type': 'application/json' }
    }

    let res = await fetch(input, finalInit)
    if (res.status === 403 && retryOn403) {
      // try once after refreshing token
      const refreshed = await refreshCsrfToken()
      if (refreshed) {
        finalInit.headers = { ...(finalInit.headers || {}), 'x-csrf-token': refreshed }
        res = await fetch(input, finalInit)
      }
    }
    return res
  }, [csrfToken, ensureCsrfToken, refreshCsrfToken])

  return { fetchWithCsrf }
}
