import { useEffect, useState, useCallback, useRef } from 'react'
import { Box, Badge, Heading, HStack, Link, Spinner, Text, VStack, Avatar } from '@chakra-ui/react'
import { type GitHubUser } from './lib/github'
import { type PullRequest, type ReviewSummary, fetchPRsNeedingReview, fetchMyPRs, setCurrentUser, estimateReviewTime, timeAgo } from './lib/pr'
import { getTrackedRepos } from './lib/repos'
import { requestNotificationPermission, checkForUpdates } from './lib/notifications'

const POLL_INTERVAL = 5 * 60 * 1000

interface Props {
  user: GitHubUser
}

function myReviewBadge(state?: string) {
  if (!state) return <Badge colorPalette="gray" variant="outline" fontSize="xs">You: not reviewed</Badge>
  if (state === 'APPROVED') return <Badge colorPalette="green" variant="outline" fontSize="xs">You: approved</Badge>
  if (state === 'CHANGES_REQUESTED') return <Badge colorPalette="red" variant="outline" fontSize="xs">You: changes requested</Badge>
  return <Badge colorPalette="gray" variant="outline" fontSize="xs">You: {state.toLowerCase()}</Badge>
}

function overallReviewBadge(reviews: ReviewSummary) {
  if (reviews.total === 0) return <Badge colorPalette="gray" fontSize="xs">No reviews</Badge>
  const parts = []
  if (reviews.approvals > 0) parts.push(`${reviews.approvals} approved`)
  if (reviews.changesRequested > 0) parts.push(`${reviews.changesRequested} changes req.`)
  const pending = reviews.total - reviews.approvals - reviews.changesRequested
  if (pending > 0) parts.push(`${pending} pending`)
  const palette = reviews.changesRequested > 0 ? 'red' : reviews.approvals > 0 ? 'green' : 'gray'
  return <Badge colorPalette={palette} fontSize="xs">{parts.join(', ')}</Badge>
}

function PRCard({ pr }: { pr: PullRequest }) {
  return (
    <Box p={3} borderWidth="1px" borderRadius="md">
      <HStack justifyContent="space-between" mb={1}>
        <HStack gap={2} flex={1} minW={0}>
          <Avatar.Root size="xs">
            <Avatar.Image src={pr.user.avatar_url} alt={pr.user.login} />
            <Avatar.Fallback>{pr.user.login[0]}</Avatar.Fallback>
          </Avatar.Root>
          <Link href={pr.html_url} target="_blank" fontWeight="medium" fontSize="sm" truncate>
            {pr.title}
          </Link>
          {pr.draft && <Badge variant="outline" fontSize="xs">Draft</Badge>}
        </HStack>
        <Badge colorPalette="blue" fontSize="xs" flexShrink={0}>
          {estimateReviewTime(pr.additions, pr.deletions)}
        </Badge>
      </HStack>
      <HStack gap={3} fontSize="xs" color="fg.muted">
        <Text>{pr.repo}</Text>
        <Text>#{pr.number}</Text>
        <Text>+{pr.additions} −{pr.deletions}</Text>
        <Text>{timeAgo(pr.updated_at)}</Text>
        {myReviewBadge(pr.reviews.myReview)}
        {overallReviewBadge(pr.reviews)}
      </HStack>
    </Box>
  )
}

export default function Dashboard({ user }: Props) {
  const [needsReview, setNeedsReview] = useState<PullRequest[]>([])
  const [myPRs, setMyPRs] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isFirstLoad = useRef(true)

  const load = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true)
    setError(null)
    try {
      const repos = getTrackedRepos()
      const [review, authored] = await Promise.all([
        fetchPRsNeedingReview(user.login, repos),
        fetchMyPRs(user.login, repos),
      ])
      setNeedsReview(review)
      setMyPRs(authored)

      if (!isFirstLoad.current) {
        checkForUpdates([...review, ...authored])
      }
      isFirstLoad.current = false
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load PRs')
    } finally {
      setLoading(false)
    }
  }, [user.login])

  useEffect(() => {
    setCurrentUser(user.login)
    requestNotificationPermission()
    load()
    const id = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [load])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <Spinner size="lg" />
      </Box>
    )
  }

  if (error) {
    return <Text color="red.500" textAlign="center" py={10}>{error}</Text>
  }

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="md" mb={3}>Needs My Review ({needsReview.length})</Heading>
        <VStack gap={2} align="stretch">
          {needsReview.length === 0 && <Text color="fg.muted" fontSize="sm">No PRs waiting for your review</Text>}
          {needsReview.map((pr) => <PRCard key={pr.html_url} pr={pr} />)}
        </VStack>
      </Box>

      <Box>
        <Heading size="md" mb={3}>My PRs ({myPRs.length})</Heading>
        <VStack gap={2} align="stretch">
          {myPRs.length === 0 && <Text color="fg.muted" fontSize="sm">No open PRs authored by you</Text>}
          {myPRs.map((pr) => <PRCard key={pr.html_url} pr={pr} />)}
        </VStack>
      </Box>
    </VStack>
  )
}
