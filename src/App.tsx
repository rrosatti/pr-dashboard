import { useState } from 'react'
import { Box, Heading, Button, HStack, Avatar } from '@chakra-ui/react'
import LoginScreen from './LoginScreen'
import RepoSettings from './RepoSettings'
import { getToken, getCachedUser, clearAuth, type GitHubUser } from './lib/github'

function App() {
  const [user, setUser] = useState<GitHubUser | null>(() =>
    getToken() ? getCachedUser() : null
  )
  const [showSettings, setShowSettings] = useState(false)

  if (!user) return <LoginScreen onLogin={setUser} />
  if (showSettings) return <RepoSettings onClose={() => setShowSettings(false)} />

  return (
    <Box p={4}>
      <HStack justifyContent="space-between" mb={6}>
        <Heading size="lg">PR Dashboard</Heading>
        <HStack gap={3}>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
            Settings
          </Button>
          <Avatar.Root size="sm">
            <Avatar.Image src={user.avatar_url} alt={user.login} />
            <Avatar.Fallback>{user.login[0]}</Avatar.Fallback>
          </Avatar.Root>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { clearAuth(); setUser(null) }}
          >
            Logout
          </Button>
        </HStack>
      </HStack>
      <Box>Dashboard coming soon...</Box>
    </Box>
  )
}

export default App
