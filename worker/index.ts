const GITHUB_URLS: Record<string, string> = {
  "/login/device/code": "https://github.com/login/device/code",
  "/login/oauth/access_token": "https://github.com/login/oauth/access_token",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const target = GITHUB_URLS[url.pathname];

    if (!target || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    const response = await fetch(target, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: request.body,
    });

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  },
};
