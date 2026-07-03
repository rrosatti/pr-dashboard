import { useState } from "react";
import { Box, Heading, Button, HStack, Avatar } from "@chakra-ui/react";
import LoginScreen from "./LoginScreen";
import RepoSettings from "./RepoSettings";
import Dashboard from "./Dashboard";
import { useStore } from "./lib/store";
import { type GitHubUser } from "./lib/github";

const App = () => {
  const user = useStore((s) => s.user);
  const clearAuth = useStore((s) => s.clearAuth);
  const setUser = useStore((s) => s.setUser);
  const [showSettings, setShowSettings] = useState(false);

  if (!user) return <LoginScreen onLogin={(u: GitHubUser) => setUser(u)} />;
  if (showSettings)
    return <RepoSettings onClose={() => setShowSettings(false)} />;

  return (
    <Box p={4}>
      <HStack justifyContent="space-between" mb={6}>
        <Heading size="lg">PR Dashboard</Heading>
        <HStack gap={3}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            Settings
          </Button>
          <Avatar.Root size="sm">
            <Avatar.Image src={user.avatar_url} alt={user.login} />
            <Avatar.Fallback>{user.login[0]}</Avatar.Fallback>
          </Avatar.Root>
          <Button variant="ghost" size="sm" onClick={() => clearAuth()}>
            Logout
          </Button>
        </HStack>
      </HStack>
      <Dashboard user={user} />
    </Box>
  );
};

export default App;
