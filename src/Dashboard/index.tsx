import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Box, Spinner, Text, VStack } from "@chakra-ui/react";
import { type GitHubUser } from "../lib/github";
import { type PullRequest, fetchPRsNeedingReview, fetchMyPRs } from "../lib/pr";
import { useStore } from "../lib/store";
import {
  requestNotificationPermission,
  checkForUpdates,
} from "../lib/notifications";
import { FilterBar } from "./FilterBar";
import { PRSection } from "./PRSection";

const POLL_INTERVAL = 5 * 60 * 1000;

interface Props {
  user: GitHubUser;
}

export const Dashboard = ({ user }: Props) => {
  const [needsReview, setNeedsReview] = useState<PullRequest[]>([]);
  const [approvedByMe, setApprovedByMe] = useState<PullRequest[]>([]);
  const [myPRs, setMyPRs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const [search, setSearch] = useState("");
  const [repoFilter, setRepoFilter] = useState<string[]>([]);
  const [stateFilter, setStateFilter] = useState<string[]>([]);

  const allPRs = useMemo(
    () => [...needsReview, ...approvedByMe, ...myPRs],
    [needsReview, approvedByMe, myPRs],
  );

  const availableRepos = useMemo(
    () => [...new Set(allPRs.map((pr) => pr.repo))].sort(),
    [allPRs],
  );

  const matches = useCallback(
    (pr: PullRequest) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !pr.title.toLowerCase().includes(q) &&
          !pr.user.login.toLowerCase().includes(q) &&
          !pr.repo.toLowerCase().includes(q) &&
          !pr.number.toString().includes(q)
        )
          return false;
      }
      if (repoFilter.length > 0 && !repoFilter.includes(pr.repo)) return false;
      if (stateFilter.length > 0) {
        const s = pr.reviews.myReview ?? "NOT_REVIEWED";
        if (!stateFilter.includes(s)) return false;
      }
      return true;
    },
    [search, repoFilter, stateFilter],
  );

  const filteredNeedsReview = useMemo(
    () => needsReview.filter(matches),
    [needsReview, matches],
  );
  const filteredApproved = useMemo(
    () => approvedByMe.filter(matches),
    [approvedByMe, matches],
  );
  const filteredMyPRs = useMemo(() => myPRs.filter(matches), [myPRs, matches]);

  const anyFilterActive =
    Boolean(search) || repoFilter.length > 0 || stateFilter.length > 0;

  const load = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true);
    setError(null);
    try {
      const repos = useStore.getState().trackedRepos;
      const [review, authored] = await Promise.all([
        fetchPRsNeedingReview(user.login, repos),
        fetchMyPRs(user.login, repos),
      ]);
      setNeedsReview(
        review.filter(
          (pr) => pr.reviews.myReview !== "APPROVED" || pr.staleReview,
        ),
      );
      setApprovedByMe(
        review.filter(
          (pr) => pr.reviews.myReview === "APPROVED" && !pr.staleReview,
        ),
      );
      setMyPRs(authored);

      if (!isFirstLoad.current) {
        checkForUpdates([...review, ...authored]);
      }
      isFirstLoad.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PRs");
    } finally {
      setLoading(false);
    }
  }, [user.login]);

  useEffect(() => {
    requestNotificationPermission();
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error) {
    return (
      <Text color="red.500" textAlign="center" py={10}>
        {error}
      </Text>
    );
  }

  return (
    <VStack gap={6} align="stretch">
      <FilterBar
        search={search}
        setSearch={setSearch}
        repoFilter={repoFilter}
        setRepoFilter={setRepoFilter}
        stateFilter={stateFilter}
        setStateFilter={setStateFilter}
        availableRepos={availableRepos}
        anyFilterActive={anyFilterActive}
      />

      <PRSection
        title="Needs My Review"
        prs={filteredNeedsReview}
        emptyMessage="No PRs waiting for your review"
        anyFilterActive={anyFilterActive}
      />

      {filteredApproved.length > 0 && (
        <PRSection
          title="Approved by Me"
          prs={filteredApproved}
          emptyMessage=""
          anyFilterActive={anyFilterActive}
        />
      )}

      <PRSection
        title="My PRs"
        prs={filteredMyPRs}
        emptyMessage="No open PRs authored by you"
        anyFilterActive={anyFilterActive}
      />
    </VStack>
  );
};

export default Dashboard;
