import { env } from "cloudflare:workers";

export const avatarKeys = ["cat", "dog", "rabbit", "bird", "fish", "ghost", "bot", "bug"] as const;
export const colorKeys = ["peach", "sky", "lavender", "coral", "mint", "mustard", "slate", "rose"] as const;

export async function ensurePresenceTable() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS room_presence (
      room_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      avatar_key TEXT NOT NULL,
      color_key TEXT NOT NULL,
      profile_id TEXT,
      profile_key TEXT,
      profile_content_type TEXT,
      last_seen INTEGER NOT NULL,
      PRIMARY KEY (room_id, client_id)
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS room_presence_active_idx ON room_presence (room_id, last_seen)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS room_presence_profile_id_idx ON room_presence (profile_id)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS rooms (
      room_id TEXT PRIMARY KEY NOT NULL,
      item_type TEXT NOT NULL DEFAULT 'thing',
      updated_at INTEGER NOT NULL
    )`),
  ]);
}

export function validIdentity(roomId: unknown, clientId: unknown) {
  return typeof roomId === "string" && roomId.length > 0 && roomId.length <= 300
    && typeof clientId === "string" && /^[a-zA-Z0-9-]{16,80}$/.test(clientId);
}
