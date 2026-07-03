import { type PullRequest } from './pr'

const LAST_SEEN_KEY = 'pr_last_seen'

interface PRSnapshot {
  url: string
  updated_at: string
}

function getLastSeen(): Record<string, PRSnapshot> {
  const raw = localStorage.getItem(LAST_SEEN_KEY)
  return raw ? JSON.parse(raw) : {}
}

function setLastSeen(prs: PullRequest[]) {
  const snapshot: Record<string, PRSnapshot> = {}
  for (const pr of prs) {
    snapshot[pr.html_url] = { url: pr.html_url, updated_at: pr.updated_at }
  }
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(snapshot))
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function checkForUpdates(allPRs: PullRequest[]) {
  const lastSeen = getLastSeen()

  for (const pr of allPRs) {
    const prev = lastSeen[pr.html_url]
    if (!prev) {
      notify(`New PR: ${pr.title}`, `${pr.repo}#${pr.number} by ${pr.user.login}`, pr.html_url)
    } else if (prev.updated_at !== pr.updated_at) {
      notify(`Updated: ${pr.title}`, `${pr.repo}#${pr.number}`, pr.html_url)
    }
  }

  setLastSeen(allPRs)
}

function notify(title: string, body: string, url: string) {
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, { body, icon: '/pr-dashboard/favicon.svg' })
  n.onclick = () => {
    window.open(url, '_blank')
    n.close()
  }
}
