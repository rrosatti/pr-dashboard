import { Box, Badge, HStack, Link, Text, Avatar } from "@chakra-ui/react";
import {
  type PullRequest,
  type ReviewSummary,
  estimateReviewTime,
  timeAgo,
} from "../lib/pr";

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

export const PRCard = ({ pr }: { pr: PullRequest }) => {
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
