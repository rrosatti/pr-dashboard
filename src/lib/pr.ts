import { fetchGitHub } from "./github";

const PER_PAGE = 50;

export interface ReviewSummary {
  approvals: number;
  changesRequested: number;
  total: number;
  myReview?: string;
}

export interface PullRequest {
  number: number;
  title: string;
  html_url: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
  additions: number;
  deletions: number;
  changed_files: number;
  repo: string;
  reviews: ReviewSummary;
  draft: boolean;
}

interface SearchItem {
  number: number;
  title: string;
  html_url: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
  draft: boolean;
  pull_request: { url: string };
  repository_url: string;
}

interface SearchResponse {
  items: SearchItem[];
}

interface PRDetail {
  additions: number;
  deletions: number;
  changed_files: number;
}

interface ReviewResponse {
  state: string;
  user: { login: string };
}

const buildReviewSummary = (
  reviews: ReviewResponse[],
  currentUser: string,
): ReviewSummary => {
  // GitHub returns all reviews chronologically; keep only each user's latest non-comment review
  const latestByUser = new Map<string, string>();
  for (const r of reviews) {
    if (r.state === "COMMENTED") continue;
    latestByUser.set(r.user.login, r.state);
  }

  let approvals = 0;
  let changesRequested = 0;
  for (const state of latestByUser.values()) {
    if (state === "APPROVED") approvals++;
    if (state === "CHANGES_REQUESTED") changesRequested++;
  }

  return {
    approvals,
    changesRequested,
    total: latestByUser.size,
    myReview: latestByUser.get(currentUser),
  };
};

const enrichPR = async (
  item: SearchItem,
  currentUser: string,
): Promise<PullRequest> => {
  const repo = item.repository_url.replace("https://api.github.com/repos/", "");
  const detail = await fetchGitHub<PRDetail>(
    `/repos/${repo}/pulls/${item.number}`,
  );

  let reviews: ReviewSummary = { approvals: 0, changesRequested: 0, total: 0 };
  try {
    const data = await fetchGitHub<ReviewResponse[]>(
      `/repos/${repo}/pulls/${item.number}/reviews`,
    );
    reviews = buildReviewSummary(data, currentUser);
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
    reviews,
    draft: item.draft,
  };
};

export const fetchPRsNeedingReview = async (
  username: string,
  repos: string[],
): Promise<PullRequest[]> => {
  const repoFilter = repos.map((r) => `repo:${r}`).join("+");
  const q = `is:pr+is:open+review-requested:${username}+${repoFilter}`;
  const data = await fetchGitHub<SearchResponse>(
    `/search/issues?q=${q}&per_page=${PER_PAGE}`,
  );
  return Promise.all(data.items.map((item) => enrichPR(item, username)));
};

export const fetchMyPRs = async (
  username: string,
  repos: string[],
): Promise<PullRequest[]> => {
  const repoFilter = repos.map((r) => `repo:${r}`).join("+");
  const q = `is:pr+is:open+author:${username}+${repoFilter}`;
  const data = await fetchGitHub<SearchResponse>(
    `/search/issues?q=${q}&per_page=${PER_PAGE}`,
  );
  return Promise.all(data.items.map((item) => enrichPR(item, username)));
};

export const estimateReviewTime = (
  additions: number,
  deletions: number,
): string => {
  const churn = additions + deletions;
  if (churn < 50) return "~5 min";
  if (churn < 200) return "~15 min";
  if (churn < 500) return "~30 min";
  if (churn < 1000) return "~1 hr";
  return "1hr+";
};

export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};
