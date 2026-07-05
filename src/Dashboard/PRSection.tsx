import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { type PullRequest } from "../lib/pr";
import { PRCard } from "./PRCard";

interface PRSectionProps {
  title: string;
  prs: PullRequest[];
  emptyMessage: string;
  anyFilterActive: boolean;
}

export const PRSection = ({
  title,
  prs,
  emptyMessage,
  anyFilterActive,
}: PRSectionProps) => {
  return (
    <Box>
      <Heading size="md" mb={3}>
        {title} ({prs.length})
      </Heading>
      <VStack gap={2} align="stretch">
        {prs.length === 0 && (
          <Text color="fg.muted" fontSize="sm">
            {anyFilterActive ? "No matching PRs" : emptyMessage}
          </Text>
        )}
        {prs.map((pr) => (
          <PRCard key={pr.html_url} pr={pr} />
        ))}
      </VStack>
    </Box>
  );
};
