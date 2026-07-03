import { useState, useEffect } from 'react'
import { Box, Button, Heading, Text, Code, VStack, Spinner } from '@chakra-ui/react'
import { requestDeviceCode, pollForToken, fetchCurrentUser, type GitHubUser } from './lib/github'

interface Props {
  onLogin: (user: GitHubUser) => void
}

export default function LoginScreen({ onLogin }: Props) {
  const [userCode, setUserCode] = useState<string | null>(null)
  const [verificationUri, setVerificationUri] = useState<string>('')
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startLogin() {
    setError(null)
    try {
      const data = await requestDeviceCode()
      setUserCode(data.user_code)
      setVerificationUri(data.verification_uri)
      setPolling(true)

      window.open(data.verification_uri, '_blank')

      const controller = new AbortController()
      await pollForToken(data.device_code, data.interval, controller.signal)
      const user = await fetchCurrentUser()
      onLogin(user)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Login failed')
      setPolling(false)
      setUserCode(null)
    }
  }

  useEffect(() => {
    return () => setPolling(false)
  }, [])

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minH="100vh">
      <VStack gap={4} textAlign="center" maxW="400px">
        <Heading size="xl">PR Dashboard</Heading>

        {!userCode ? (
          <>
            <Text color="fg.muted">Track your pull requests across multiple repos</Text>
            <Button colorPalette="blue" size="lg" onClick={startLogin}>
              Login with GitHub
            </Button>
          </>
        ) : (
          <>
            <Text>Enter this code on GitHub:</Text>
            <Code fontSize="2xl" p={3}>{userCode}</Code>
            <Text fontSize="sm" color="fg.muted">
              A new tab should have opened to{' '}
              <a href={verificationUri} target="_blank" rel="noopener noreferrer">
                {verificationUri}
              </a>
            </Text>
            {polling && (
              <Box display="flex" alignItems="center" gap={2}>
                <Spinner size="sm" />
                <Text fontSize="sm">Waiting for authorization...</Text>
              </Box>
            )}
          </>
        )}

        {error && <Text color="red.500">{error}</Text>}
      </VStack>
    </Box>
  )
}
