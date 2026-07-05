import { fetchGitHub } from "./github";

const PER_PAGE = 100;

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
  reviewRequested: boolean;
  staleReview?: boolean;
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
  submitted_at: string;
}

interface CommitResponse {
  commit: {
    committer: {
      date: string;
    };
  };
}

const fetchAllSearchResults = async (query: string): Promise<SearchItem[]> => {
  const allItems: SearchItem[] = [];
  let page = 1;

  while (true) {
    const data = await fetchGitHub<SearchResponse>(
      `/search/issues?q=${query}&per_page=${PER_PAGE}&page=${page}`,
    );
    allItems.push(...data.items);
    if (data.items.length < PER_PAGE) break;
    page++;
  }

  return allItems;
};

const buildReviewSummary = (reviews: ReviewResponse[], currentUser: string) => {
  // For overall counts: the latest non-COMMENTED review per user (including DISMISSED)
  const latestByUser = new Map<string, string>();
  // For current-user display: prefer non-DISMISSED, fall back to DISMISSED or COMMENTED
  let displayState: string | undefined;
  let displayDate: string | undefined;
  let currentUserCommented = false;

  for (const r of reviews) {
    if (r.state === "COMMENTED") {
      if (r.user.login === currentUser) currentUserCommented = true;
      continue;
    }

    // Track for overall counts (including DISMISSED)
    latestByUser.set(r.user.login, r.state);

    // For current user's display: DISMISSED updates date but not state
    if (r.user.login === currentUser) {
      if (r.state === "DISMISSED") {
        if (!displayDate || r.submitted_at > displayDate) {
          displayDate = r.submitted_at;
        }
      } else {
        displayState = r.state;
        if (!displayDate || r.submitted_at > displayDate) {
          displayDate = r.submitted_at;
        }
      }
    }
  }

  let approvals = 0;
  let changesRequested = 0;
  for (const state of latestByUser.values()) {
    if (state === "APPROVED") approvals++;
    if (state === "CHANGES_REQUESTED") changesRequested++;
  }

  let myReview = displayState;
  if (!myReview && currentUserCommented) myReview = "COMMENTED";

  return {
    approvals,
    changesRequested,
    total: latestByUser.size,
    myReview,
    myReviewDate: displayDate,
  };
};

const enrichPR = async (
  item: SearchItem,
  currentUser: string,
  reviewRequested = false,
): Promise<PullRequest> => {
  const repo = item.repository_url.replace("https://api.github.com/repos/", "");
  const [detail, reviewData] = await Promise.all([
    fetchGitHub<PRDetail>(`/repos/${repo}/pulls/${item.number}`),
    fetchGitHub<ReviewResponse[]>(
      `/repos/${repo}/pulls/${item.number}/reviews`,
    ).catch(() => [] as ReviewResponse[]),
  ]);

  const { myReviewDate, ...reviews } = buildReviewSummary(
    reviewData,
    currentUser,
  );

  let staleReview: boolean | undefined;
  if (myReviewDate && item.updated_at > myReviewDate) {
    try {
      const commits = await fetchGitHub<CommitResponse[]>(
        `/repos/${repo}/pulls/${item.number}/commits?per_page=1`,
      );
      if (commits.length > 0) {
        staleReview = commits[0].commit.committer.date > myReviewDate;
      }
    } catch {
      // no commit access
    }
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
    reviewRequested,
    staleReview,
  };
};

export const fetchPRsNeedingReview = async (
  username: string,
  repos: string[],
): Promise<PullRequest[]> => {
  if (repos.length === 0) return [];

  const repoFilter = repos.map((r) => `repo:${r}`).join("+");

  const requestQ = `is:pr+is:open+review-requested:${username}+${repoFilter}`;
  const participateQ = `is:pr+is:open+commenter:${username}+-author:${username}+-review-requested:${username}+${repoFilter}`;

  const [requested, participated] = await Promise.all([
    fetchAllSearchResults(requestQ),
    fetchAllSearchResults(participateQ),
  ]);

  const seen = new Set<string>();
  const key = (item: SearchItem) =>
    `${item.repository_url.replace("https://api.github.com/repos/", "")}#${item.number}`;

  const items: { item: SearchItem; reviewRequested: boolean }[] = [];

  for (const item of requested) {
    seen.add(key(item));
    items.push({ item, reviewRequested: true });
  }

  for (const item of participated) {
    if (!seen.has(key(item))) {
      items.push({ item, reviewRequested: false });
    }
  }

  return Promise.all(
    items.map(({ item, reviewRequested }) =>
      enrichPR(item, username, reviewRequested),
    ),
  );
};

export const fetchMyPRs = async (
  username: string,
  repos: string[],
): Promise<PullRequest[]> => {
  if (repos.length === 0) return [];

  const repoFilter = repos.map((r) => `repo:${r}`).join("+");
  const q = `is:pr+is:open+author:${username}+${repoFilter}`;
  const items = await fetchAllSearchResults(q);
  return Promise.all(items.map((item) => enrichPR(item, username)));
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
