import { useState } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useStore } from "./lib/store";

interface Props {
  onClose: () => void;
}

export const RepoSettings = ({ onClose }: Props) => {
  const storedRepos = useStore((s) => s.trackedRepos);
  const setTrackedRepos = useStore((s) => s.setTrackedRepos);
  const [repos, setRepos] = useState(storedRepos);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addRepo() {
    const repo = input.trim();
    if (!repo.match(/^[^/]+\/[^/]+$/)) {
      setError("Format: owner/repo");
      return;
    }
    if (repos.includes(repo)) {
      setError("Already tracked");
      return;
    }
    const updated = [...repos, repo];
    setRepos(updated);
    setTrackedRepos(updated);
    setInput("");
    setError(null);
  }

  function removeRepo(repo: string) {
    const updated = repos.filter((r) => r !== repo);
    setRepos(updated);
    setTrackedRepos(updated);
  }

  return (
    <Box p={4} maxW="600px" mx="auto">
      <HStack justifyContent="space-between" mb={4}>
        <Heading size="md">Tracked Repositories</Heading>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Back
        </Button>
      </HStack>

      <VStack gap={2} align="stretch" mb={4}>
        {repos.map((repo) => (
          <HStack
            key={repo}
            justifyContent="space-between"
            p={2}
            borderWidth="1px"
            borderRadius="md"
          >
            <Text fontSize="sm">{repo}</Text>
            <IconButton
              aria-label={`Remove ${repo}`}
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={() => removeRepo(repo)}
            >
              ✕
            </IconButton>
          </HStack>
        ))}
      </VStack>

      <HStack>
        <Input
          placeholder="owner/repo"
          size="sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addRepo()}
        />
        <Button size="sm" onClick={addRepo}>
          Add
        </Button>
      </HStack>
      {error && (
        <Text color="red.500" fontSize="sm" mt={1}>
          {error}
        </Text>
      )}
    </Box>
  );
};

export default RepoSettings;
