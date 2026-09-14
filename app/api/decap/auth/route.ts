import { beginGitHubAuthorization } from "@/lib/decap-oauth";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return beginGitHubAuthorization(request);
}
