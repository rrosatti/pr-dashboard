const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID
const AUTH_PROXY = import.meta.env.VITE_AUTH_PROXY_URL

const TOKEN_KEY = 'gh_token'
const USER_KEY = 'gh_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getCachedUser(): GitHubUser | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const res = await fetch(`${AUTH_PROXY}/login/device/code`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: 'repo' }),
  })
  return res.json()
}

export async function pollForToken(
  deviceCode: string,
  interval: number,
  signal?: AbortSignal
): Promise<string> {
  const poll = async (): Promise<string> => {
    const res = await fetch(`${AUTH_PROXY}/login/oauth/access_token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    })
    const data = await res.json()

    if (data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token)
      return data.access_token
    }

    if (data.error === 'authorization_pending') {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, interval * 1000)
        signal?.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
      return poll()
    }

    if (data.error === 'slow_down') {
      await new Promise((resolve) => setTimeout(resolve, (interval + 5) * 1000))
      return poll()
    }

    throw new Error(data.error_description || data.error || 'Unknown error')
  }
  return poll()
}

export async function fetchGitHub<T = unknown>(endpoint: string): Promise<T> {
  const token = getToken()
  const res = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
  return res.json()
}

export async function fetchCurrentUser(): Promise<GitHubUser> {
  const user = await fetchGitHub<GitHubUser>('/user')
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}
