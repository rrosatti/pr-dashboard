import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box,
  Badge,
  Heading,
  HStack,
  Link,
  Spinner,
  Text,
  VStack,
  Avatar,
  Input,
  Wrap,
} from "@chakra-ui/react";
import { type GitHubUser } from "./lib/github";
import {
  type PullRequest,
  type ReviewSummary,
  fetchPRsNeedingReview,
  fetchMyPRs,
  estimateReviewTime,
  timeAgo,
} from "./lib/pr";
import { useStore } from "./lib/store";
import {
  requestNotificationPermission,
  checkForUpdates,
} from "./lib/notifications";

const POLL_INTERVAL = 5 * 60 * 1000;
const STATE_OPTIONS = [
  "NOT_REVIEWED",
  "APPROVED",
  "CHANGES_REQUESTED",
  "COMMENTED",
];

interface Props {
  user: GitHubUser;
}

const myReviewBadge = (state?: string) => {
  if (!state)
    return (
      <Badge colorPalette="gray" variant="outline" fontSize="xs">
        You: not reviewed
      </Badge>
    );
  if (state === "APPROVED")
    return (
      <Badge colorPalette="green" variant="outline" fontSize="xs">
        You: approved
      </Badge>
    );
  if (state === "CHANGES_REQUESTED")
    return (
      <Badge colorPalette="red" variant="outline" fontSize="xs">
        You: changes requested
      </Badge>
    );
  if (state === "COMMENTED")
    return (
      <Badge colorPalette="gray" variant="outline" fontSize="xs">
        You: commented
      </Badge>
    );
  return (
    <Badge colorPalette="gray" variant="outline" fontSize="xs">
      You: {state.toLowerCase()}
    </Badge>
  );
};

const overallReviewBadge = (reviews: ReviewSummary) => {
  if (reviews.total === 0)
    return (
      <Badge colorPalette="gray" fontSize="xs">
        No reviews
      </Badge>
    );
  return (
    <>
      {reviews.approvals > 0 && (
        <Badge colorPalette="green" fontSize="xs">
          {reviews.approvals} approved
        </Badge>
      )}
      {reviews.changesRequested > 0 && (
        <Badge colorPalette="red" fontSize="xs">
          {reviews.changesRequested} changes req.
        </Badge>
      )}
    </>
  );
};

const PRCard = ({ pr }: { pr: PullRequest }) => {
  return (
    <Box p={3} borderWidth="1px" borderRadius="md">
      <HStack justifyContent="space-between" mb={1}>
        <HStack gap={2} flex={1} minW={0}>
          <Avatar.Root size="xs">
            <Avatar.Image src={pr.user.avatar_url} alt={pr.user.login} />
            <Avatar.Fallback>{pr.user.login[0]}</Avatar.Fallback>
          </Avatar.Root>
          <Link
            href={pr.html_url}
            target="_blank"
            fontWeight="medium"
            fontSize="sm"
            truncate
          >
            {pr.title}
          </Link>
          {pr.draft && (
            <Badge variant="outline" fontSize="xs">
              Draft
            </Badge>
          )}
        </HStack>
        <Badge colorPalette="blue" fontSize="xs" flexShrink={0}>
          {estimateReviewTime(pr.additions, pr.deletions)}
        </Badge>
      </HStack>
      <HStack gap={3} fontSize="xs" color="fg.muted">
        <Text>{pr.repo}</Text>
        <Text>#{pr.number}</Text>
        <Text>
          +{pr.additions} −{pr.deletions}
        </Text>
        <Text>{timeAgo(pr.updated_at)}</Text>
        {myReviewBadge(pr.reviews.myReview)}
        {pr.staleReview && (
          <Badge colorPalette="orange" variant="outline" fontSize="xs">
            New commits since your review
          </Badge>
        )}
        {overallReviewBadge(pr.reviews)}
      </HStack>
    </Box>
  );
};

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

  const toggleFilter = (
    arr: string[],
    val: string,
    set: (v: string[]) => void,
  ) => set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const anyFilterActive =
    search || repoFilter.length > 0 || stateFilter.length > 0;

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
      <Box>
        <Input
          placeholder="Search PRs by title, author, repo, number, label…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          mb={3}
        />
        {anyFilterActive && (
          <HStack gap={2} wrap="wrap" mb={2}>
            <Text fontSize="xs" color="fg.muted">
              Filters:
            </Text>
            {repoFilter.map((r) => (
              <Badge
                key={r}
                colorPalette="blue"
                cursor="pointer"
                fontSize="xs"
                onClick={() => toggleFilter(repoFilter, r, setRepoFilter)}
              >
                {r} ✕
              </Badge>
            ))}
            {stateFilter.map((s) => (
              <Badge
                key={s}
                colorPalette="gray"
                cursor="pointer"
                fontSize="xs"
                onClick={() => toggleFilter(stateFilter, s, setStateFilter)}
              >
                {s === "NOT_REVIEWED" ? "Not reviewed" : s.toLowerCase()} ✕
              </Badge>
            ))}
          </HStack>
        )}
        <Wrap gap={2} mb={4}>
          <Badge
            colorPalette={repoFilter.length === 0 ? "gray" : undefined}
            variant={repoFilter.length === 0 ? "outline" : "solid"}
            cursor="pointer"
            fontSize="xs"
            onClick={() =>
              setRepoFilter(repoFilter.length > 0 ? [] : [...availableRepos])
            }
          >
            {repoFilter.length === 0
              ? "All repos"
              : `${repoFilter.length} repos`}
          </Badge>
          {availableRepos.map((r) => (
            <Badge
              key={r}
              colorPalette="blue"
              variant={repoFilter.includes(r) ? "solid" : "outline"}
              cursor="pointer"
              fontSize="xs"
              onClick={() => toggleFilter(repoFilter, r, setRepoFilter)}
            >
              {r}
            </Badge>
          ))}
        </Wrap>
        <Wrap gap={2} mb={4}>
          <Badge
            colorPalette="gray"
            variant={
              stateFilter.length === STATE_OPTIONS.length ? "solid" : "outline"
            }
            cursor="pointer"
            fontSize="xs"
            onClick={() =>
              setStateFilter(
                stateFilter.length === STATE_OPTIONS.length
                  ? []
                  : [...STATE_OPTIONS],
              )
            }
          >
            All states
          </Badge>
          {STATE_OPTIONS.map((s) => (
            <Badge
              key={s}
              colorPalette={
                s === "APPROVED"
                  ? "green"
                  : s === "CHANGES_REQUESTED"
                    ? "red"
                    : "gray"
              }
              variant={stateFilter.includes(s) ? "solid" : "outline"}
              cursor="pointer"
              fontSize="xs"
              onClick={() => toggleFilter(stateFilter, s, setStateFilter)}
            >
              {s === "NOT_REVIEWED" ? "Not reviewed" : s.toLowerCase()}
            </Badge>
          ))}
        </Wrap>
      </Box>

      <Box>
        <Heading size="md" mb={3}>
          Needs My Review ({filteredNeedsReview.length})
        </Heading>
        <VStack gap={2} align="stretch">
          {filteredNeedsReview.length === 0 && (
            <Text color="fg.muted" fontSize="sm">
              {anyFilterActive
                ? "No matching PRs"
                : "No PRs waiting for your review"}
            </Text>
          )}
          {filteredNeedsReview.map((pr) => (
            <PRCard key={pr.html_url} pr={pr} />
          ))}
        </VStack>
      </Box>

      {filteredApproved.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>
            Approved by Me ({filteredApproved.length})
          </Heading>
          <VStack gap={2} align="stretch">
            {filteredApproved.map((pr) => (
              <PRCard key={pr.html_url} pr={pr} />
            ))}
          </VStack>
        </Box>
      )}

      <Box>
        <Heading size="md" mb={3}>
          My PRs ({filteredMyPRs.length})
        </Heading>
        <VStack gap={2} align="stretch">
          {filteredMyPRs.length === 0 && (
            <Text color="fg.muted" fontSize="sm">
              {anyFilterActive
                ? "No matching PRs"
                : "No open PRs authored by you"}
            </Text>
          )}
          {filteredMyPRs.map((pr) => (
            <PRCard key={pr.html_url} pr={pr} />
          ))}
        </VStack>
      </Box>
    </VStack>
  );
};

export default Dashboard;
