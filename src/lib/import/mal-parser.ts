// Parser for MyAnimeList's XML list export (Profile → List → Export, or
// https://myanimelist.net/panel.php?go=export). The format is flat and
// consistent enough that a small hand-written parser is more honest than
// pulling in a full XML library for one use: each entry is a run of
// sibling <field>value</field> elements inside <anime>...</anime>, values
// either plain text or CDATA-wrapped.
export type MalEntry = {
  malId: number;
  title: string;
  status: "Watching" | "Completed" | "On-Hold" | "Dropped" | "Plan to Watch";
  score: number; // 0 = unscored, else 1-10
  progress: number;
  rewatching: boolean;
};

const MAL_STATUSES = new Set(["Watching", "Completed", "On-Hold", "Dropped", "Plan to Watch"]);

function field(block: string, name: string): string | null {
  const re = new RegExp(`<${name}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${name}>`);
  const m = re.exec(block);
  if (!m) return null;
  return (m[1] ?? m[2] ?? "").trim();
}

export class MalParseError extends Error {}

export function parseMalXml(xml: string): MalEntry[] {
  if (!xml.includes("<myanimelist>")) {
    throw new MalParseError(
      "That doesn't look like a MyAnimeList export file (missing <myanimelist> root element).",
    );
  }

  const blocks = xml.match(/<anime>[\s\S]*?<\/anime>/g) ?? [];
  if (blocks.length === 0) {
    throw new MalParseError("No anime entries found in this file.");
  }

  return blocks
    .map((block): MalEntry | null => {
      const malId = Number(field(block, "series_animedb_id"));
      const title = field(block, "series_title");
      const status = field(block, "my_status");
      if (!Number.isInteger(malId) || malId <= 0 || !title || !status || !MAL_STATUSES.has(status)) {
        return null;
      }

      return {
        malId,
        title,
        status: status as MalEntry["status"],
        score: Number(field(block, "my_score")) || 0,
        progress: Number(field(block, "my_watched_episodes")) || 0,
        rewatching: field(block, "my_rewatching") === "1",
      };
    })
    .filter((e): e is MalEntry => e != null);
}
