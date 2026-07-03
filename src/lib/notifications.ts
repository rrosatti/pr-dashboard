import { useStore } from "./store";
import { type PullRequest } from "./pr";

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
};

export const checkForUpdates = (allPRs: PullRequest[]) => {
  const lastSeen = useStore.getState().lastSeen;

  for (const pr of allPRs) {
    const prev = lastSeen[pr.html_url];
    if (!prev) {
      notify(
        `New PR: ${pr.title}`,
        `${pr.repo}#${pr.number} by ${pr.user.login}`,
        pr.html_url,
      );
    } else if (prev.updated_at !== pr.updated_at) {
      notify(`Updated: ${pr.title}`, `${pr.repo}#${pr.number}`, pr.html_url);
    }
  }

  useStore.getState().setLastSeen(allPRs);
};

const notify = (title: string, body: string, url: string) => {
  if (Notification.permission !== "granted") return;
  const n = new Notification(title, {
    body,
    icon: "/pr-dashboard/favicon.svg",
  });
  n.onclick = () => {
    window.open(url, "_blank");
    n.close();
  };
};
