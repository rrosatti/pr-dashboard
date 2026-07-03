import { fetchGitHub } from './github'

export interface PullRequest {
  number: number
  title: string
  html_url: string
  updated_at: string
  user: { login: string; avatar_url: string }
  additions: number
  deletions: number
  changed_files: number
  repo: string
  review_decision?: string
  draft: boolean
}

interface SearchItem {
  number: number
  title: string
  html_url: string
  updated_at: string
  user: { login: string; avatar_url: string }
  draft: boolean
  pull_request: { url: string }
  repository_url: string
}

interface SearchResponse {
  items: SearchItem[]
}

interface PRDetail {
  additions: number
  deletions: number
  changed_files: number
}

interface ReviewResponse {
  state: string
}

async function enrichPR(item: SearchItem): Promise<PullRequest> {
  const repo = item.repository_url.replace('https://api.github.com/repos/', '')
  const detail = await fetchGitHub<PRDetail>(`/repos/${repo}/pulls/${item.number}`)

  let review_decision: string | undefined
  try {
    const reviews = await fetchGitHub<ReviewResponse[]>(`/repos/${repo}/pulls/${item.number}/reviews`)
    const latest = reviews.filter((r) => r.state !== 'COMMENTED').pop()
    review_decision = latest?.state
  } catch {
    // no review access
  }

  return {
    number: item.number,
    title: item.title,
    html_url: item.html_url,
    updated_at: item.updated_at,
    user: item.user,
    additions: detail.additions,
    deletions: detail.deletions,
    changed_files: detail.changed_files,
    repo,
    review_decision,
    draft: item.draft,
  }
}

export async function fetchPRsNeedingReview(username: string, repos: string[]): Promise<PullRequest[]> {
  const repoFilter = repos.map((r) => `repo:${r}`).join('+')
  const q = `is:pr+is:open+review-requested:${username}+${repoFilter}`
  const data = await fetchGitHub<SearchResponse>(`/search/issues?q=${q}&per_page=50`)
  return Promise.all(data.items.map(enrichPR))
}

export async function fetchMyPRs(username: string, repos: string[]): Promise<PullRequest[]> {
  const repoFilter = repos.map((r) => `repo:${r}`).join('+')
  const q = `is:pr+is:open+author:${username}+${repoFilter}`
  const data = await fetchGitHub<SearchResponse>(`/search/issues?q=${q}&per_page=50`)
  return Promise.all(data.items.map(enrichPR))
}

export function estimateReviewTime(additions: number, deletions: number): string {
  const churn = additions + deletions
  if (churn < 50) return '~5 min'
  if (churn < 200) return '~15 min'
  if (churn < 500) return '~30 min'
  if (churn < 1000) return '~1 hr'
  return '1hr+'
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
