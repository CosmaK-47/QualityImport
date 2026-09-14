import { env } from "cloudflare:workers";

const SITE_ORIGIN = "https://qi-quality-imports.cosmak-47.chatgpt.site";
const STATE_COOKIE = "qi_decap_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;

type GitHubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  scope?: string;
  token_type?: string;
};

type GitHubUser = {
  login?: string;
};

function environmentValue(name: string): string {
  const value = (env as unknown as Record<string, unknown>)[name];
  return typeof value === "string" ? value.trim() : "";
}

function githubCredentials() {
  return {
    clientId: environmentValue("GITHUB_OAUTH_CLIENT_ID"),
    clientSecret: environmentValue("GITHUB_OAUTH_CLIENT_SECRET"),
  };
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stateCookie(value: string, maxAge = STATE_TTL_SECONDS): string {
  return `${STATE_COOKIE}=${encodeURIComponent(value)}; Path=/api/decap; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function cookieValue(request: Request, name: string): string {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [cookieName, ...rawValue] = part.trim().split("=");
    if (cookieName !== name) continue;
    try {
      return decodeURIComponent(rawValue.join("="));
    } catch {
      return "";
    }
  }
  return "";
}

function statesMatch(expected: string, received: string): boolean {
  if (!expected || expected.length !== received.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  }
  return difference === 0;
}

function allowedGitHubUsers(): Set<string> {
  const configured = environmentValue("DECAP_GITHUB_ALLOWED_USERS") || "CosmaK-47";
  return new Set(
    configured
      .split(",")
      .map((login) => login.trim().toLowerCase())
      .filter(Boolean),
  );
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function popupResponse(
  status: "success" | "error",
  payload: Record<string, unknown>,
  responseStatus = 200,
): Response {
  const authorizationMessage = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const title = status === "success" ? "GitHub connected" : "GitHub connection failed";
  const body = status === "success"
    ? "GitHub is connected. This window can close safely."
    : "GitHub could not be connected. Close this window and try again.";
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#08090b;color:#f5f5f2;font:16px/1.5 system-ui;display:grid;min-height:100vh;place-items:center">
    <main style="max-width:32rem;padding:2rem;text-align:center">
      <h1 style="font-size:1.4rem">${title}</h1>
      <p>${body}</p>
    </main>
    <script>
      (() => {
        const result = ${safeJson(authorizationMessage)};
        const targetOrigin = ${safeJson(SITE_ORIGIN)};
        if (!window.opener) return;
        const receiveMessage = (event) => {
          if (event.origin !== targetOrigin) return;
          window.opener.postMessage(result, targetOrigin);
          window.removeEventListener("message", receiveMessage, false);
          window.setTimeout(() => window.close(), 100);
        };
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", targetOrigin);
      })();
    </script>
  </body>
</html>`;

  return new Response(html, {
    status: responseStatus,
    headers: {
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      "content-type": "text/html; charset=utf-8",
      "referrer-policy": "no-referrer",
      "set-cookie": stateCookie("", 0),
      "x-content-type-options": "nosniff",
    },
  });
}

export function beginGitHubAuthorization(request: Request): Response {
  const { clientId } = githubCredentials();
  if (!clientId) {
    return popupResponse("error", { message: "GitHub OAuth is not configured yet." }, 503);
  }

  const requestUrl = new URL(request.url);
  const siteId = requestUrl.searchParams.get("site_id");
  if (siteId && siteId !== new URL(SITE_ORIGIN).hostname) {
    return popupResponse("error", { message: "This admin origin is not allowed." }, 403);
  }

  const state = randomState();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", `${SITE_ORIGIN}/api/decap/callback`);
  authorizeUrl.searchParams.set("scope", "public_repo");
  authorizeUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      "cache-control": "no-store",
      location: authorizeUrl.toString(),
      "referrer-policy": "no-referrer",
      "set-cookie": stateCookie(state),
    },
  });
}

export async function completeGitHubAuthorization(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const oauthError = requestUrl.searchParams.get("error");
  if (oauthError) {
    return popupResponse("error", {
      message: requestUrl.searchParams.get("error_description") || oauthError,
    }, 401);
  }

  const state = requestUrl.searchParams.get("state") ?? "";
  const expectedState = cookieValue(request, STATE_COOKIE);
  if (!statesMatch(expectedState, state)) {
    return popupResponse("error", { message: "The OAuth request expired or could not be verified." }, 400);
  }

  const code = requestUrl.searchParams.get("code") ?? "";
  const { clientId, clientSecret } = githubCredentials();
  if (!code || !clientId || !clientSecret) {
    return popupResponse("error", { message: "GitHub OAuth is not completely configured." }, 503);
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "QI-Quality-Imports-Decap",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${SITE_ORIGIN}/api/decap/callback`,
        state,
      }),
    });
    const tokenResult = await tokenResponse.json() as GitHubTokenResponse;
    if (!tokenResponse.ok || !tokenResult.access_token || tokenResult.error) {
      return popupResponse("error", {
        message: tokenResult.error_description || tokenResult.error || "GitHub rejected the authorization request.",
      }, 401);
    }

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${tokenResult.access_token}`,
        "user-agent": "QI-Quality-Imports-Decap",
        "x-github-api-version": "2022-11-28",
      },
    });
    const user = await userResponse.json() as GitHubUser;
    const login = user.login?.toLowerCase() ?? "";
    if (!userResponse.ok || !allowedGitHubUsers().has(login)) {
      return popupResponse("error", { message: "This GitHub account is not authorized for QI Admin." }, 403);
    }

    return popupResponse("success", {
      provider: "github",
      token: tokenResult.access_token,
    });
  } catch {
    return popupResponse("error", { message: "GitHub is temporarily unavailable. Please try again." }, 502);
  }
}
