import { useStore } from "./store";

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const AUTH_PROXY = import.meta.env.VITE_AUTH_PROXY_URL;

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export const requestDeviceCode = async (): Promise<DeviceCodeResponse> => {
  const res = await fetch(`${AUTH_PROXY}/login/device/code`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: "repo" }),
  });
  return res.json();
};

export const pollForToken = async (
  deviceCode: string,
  interval: number,
  signal?: AbortSignal,
): Promise<string> => {
  const poll = async (): Promise<string> => {
    const res = await fetch(`${AUTH_PROXY}/login/oauth/access_token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });
    const data = await res.json();

    if (data.access_token) {
      useStore.getState().setToken(data.access_token);
      return data.access_token;
    }

    if (data.error === "authorization_pending") {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, interval * 1000);
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
      return poll();
    }

    if (data.error === "slow_down") {
      await new Promise((resolve) =>
        setTimeout(resolve, (interval + 5) * 1000),
      );
      return poll();
    }

    throw new Error(data.error_description || data.error || "Unknown error");
  };
  return poll();
};

export const fetchGitHub = async <T = unknown>(
  endpoint: string,
): Promise<T> => {
  const token = useStore.getState().token;
  const res = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  return res.json();
};

export const fetchCurrentUser = async (): Promise<GitHubUser> => {
  const user = await fetchGitHub<GitHubUser>("/user");
  useStore.getState().setUser(user);
  return user;
};
