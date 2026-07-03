import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type GitHubUser } from "./github";
import { type PullRequest } from "./pr";

interface PRSnapshot {
  url: string;
  updated_at: string;
}

const DEFAULT_REPOS = [
  "konflux-ci/konflux-ui",
  "redhat-appstudio/infra-deployments",
  "redhat-developer/rhdh-plugins",
];

interface AppState {
  token: string | null;
  user: GitHubUser | null;
  trackedRepos: string[];
  lastSeen: Record<string, PRSnapshot>;
  currentUser: string;

  setToken: (token: string | null) => void;
  setUser: (user: GitHubUser | null) => void;
  setTrackedRepos: (repos: string[]) => void;
  setLastSeen: (prs: PullRequest[]) => void;
  setCurrentUser: (username: string) => void;
  clearAuth: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      trackedRepos: DEFAULT_REPOS,
      lastSeen: {},
      currentUser: "",

      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setTrackedRepos: (trackedRepos) => set({ trackedRepos }),
      setLastSeen: (prs) => {
        const snapshot: Record<string, PRSnapshot> = {};
        for (const pr of prs) {
          snapshot[pr.html_url] = { url: pr.html_url, updated_at: pr.updated_at };
        }
        set({ lastSeen: snapshot });
      },
      setCurrentUser: (currentUser) => set({ currentUser }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: "pr-dashboard-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        trackedRepos: state.trackedRepos,
        lastSeen: state.lastSeen,
      }),
    },
  ),
);
