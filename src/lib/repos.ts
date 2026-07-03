const REPOS_KEY = 'tracked_repos'

const DEFAULT_REPOS = [
  'konflux-ci/konflux-ui',
  'redhat-appstudio/infra-deployments',
  'redhat-developer/rhdh-plugins',
]

export function getTrackedRepos(): string[] {
  const raw = localStorage.getItem(REPOS_KEY)
  return raw ? JSON.parse(raw) : DEFAULT_REPOS
}

export function setTrackedRepos(repos: string[]) {
  localStorage.setItem(REPOS_KEY, JSON.stringify(repos))
}
