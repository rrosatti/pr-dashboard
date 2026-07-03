import { useEffect, useState, useCallback, useRef } from 'react'
import { Box, Badge, Heading, HStack, Link, Spinner, Text, VStack, Avatar } from '@chakra-ui/react'
import { type GitHubUser } from './lib/github'
import { type PullRequest, fetchPRsNeedingReview, fetchMyPRs, estimateReviewTime, timeAgo } from './lib/pr'
import { getTrackedRepos } from './lib/repos'
import { requestNotificationPermission, checkForUpdates } from './lib/notifications'

const POLL_INTERVAL = 5 * 60 * 1000

interface Props {
  user: GitHubUser
}

function reviewBadge(decision?: string) {
  if (!decision) return <Badge colorPalette="gray">Pending</Badge>
  if (decision === 'APPROVED') return <Badge colorPalette="green">Approved</Badge>
  if (decision === 'CHANGES_REQUESTED') return <Badge colorPalette="red">Changes Requested</Badge>
  return <Badge colorPalette="gray">{decision}</Badge>
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
        {pr.review_decision && reviewBadge(pr.review_decision)}
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
