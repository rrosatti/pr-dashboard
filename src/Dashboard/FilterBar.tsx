import { Box, Badge, HStack, Text, Input, Wrap } from "@chakra-ui/react";

const STATE_OPTIONS = [
  "NOT_REVIEWED",
  "APPROVED",
  "CHANGES_REQUESTED",
  "COMMENTED",
];

const toggleFilter = (arr: string[], val: string, set: (v: string[]) => void) =>
  set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

interface FilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  repoFilter: string[];
  setRepoFilter: (v: string[]) => void;
  stateFilter: string[];
  setStateFilter: (v: string[]) => void;
  availableRepos: string[];
  anyFilterActive: boolean;
}

export const FilterBar = ({
  search,
  setSearch,
  repoFilter,
  setRepoFilter,
  stateFilter,
  setStateFilter,
  availableRepos,
  anyFilterActive,
}: FilterBarProps) => {
  return (
    <Box>
      <Input
        placeholder="Search PRs by title, author, repo, number…"
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
          {repoFilter.length === 0 ? "All repos" : `${repoFilter.length} repos`}
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
  );
};
