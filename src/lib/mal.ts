// Thin client for the official MyAnimeList API v2
// (https://myanimelist.net/apiconfig/references/api/v2), used only by the
// list import feature (src/app/import) to read a *public* user's anime
// list by username. Reading a public list only needs our own registered
// Client ID header — no OAuth/user login required, same shape as the
// AniList-by-username import path. Register a (Non-Commercial) app at
// https://myanimelist.net/apiconfig to get MAL_CLIENT_ID.
import type { MalEntry } from "@/lib/import/mal-parser";

const MAL_API_URL = "https://api.myanimelist.net/v2";

const STATUS_MAP: Record<string, MalEntry["status"]> = {
  watching: "Watching",
  completed: "Completed",
  on_hold: "On-Hold",
  dropped: "Dropped",
  plan_to_watch: "Plan to Watch",
};

export class MalApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type MalListPage = {
  data: {
    node: { id: number; title: string };
    list_status?: {
      status: string;
      score: number;
      num_episodes_watched: number;
      is_rewatching: boolean;
    };
  }[];
  paging?: { next?: string };
};

// Loops through every page of the user's list. MAL's own web client tops
// out around a few thousand entries even for prolific users, so this
// won't run away — but there's no artificial cap here either.
export async function getMalUserList(username: string): Promise<MalEntry[]> {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId) {
    throw new MalApiError("MAL import isn't configured on this server (missing MAL_CLIENT_ID).", 500);
  }

  const entries: MalEntry[] = [];
  let url: string | undefined =
    `${MAL_API_URL}/users/${encodeURIComponent(username)}/animelist` +
    `?fields=list_status&limit=1000&nsfw=true`;

  while (url) {
    const res = await fetch(url, { headers: { "X-MAL-Client-ID": clientId } });

    if (res.status === 404) {
      throw new MalApiError("That MyAnimeList username doesn't exist.", 404);
    }
    if (!res.ok) {
      throw new MalApiError(`MyAnimeList request failed (${res.status})`, res.status);
    }

    const json: MalListPage = await res.json();
    for (const { node, list_status } of json.data) {
      if (!list_status) continue;
      const status = STATUS_MAP[list_status.status];
      if (!status) continue;
      entries.push({
        malId: node.id,
        title: node.title,
        status,
        score: list_status.score ?? 0,
        progress: list_status.num_episodes_watched ?? 0,
        rewatching: list_status.is_rewatching ?? false,
      });
    }

    url = json.paging?.next;
  }

  return entries;
}
