import { env } from "cloudflare:workers";
import { avatarKeys, colorKeys, ensurePresenceTable, validIdentity } from "../_lib/presence";

export const runtime = "edge";

type PresenceRow = {
  client_id: string;
  avatar_key: string;
  color_key: string;
  profile_id: string | null;
  last_seen: number;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { roomId?: unknown; clientId?: unknown } | null;
  if (!body || !validIdentity(body.roomId, body.clientId)) {
    return Response.json({ error: "Invalid room identity" }, { status: 400 });
  }
  const roomId = body.roomId as string;
  const clientId = body.clientId as string;
  const now = Date.now();
  const activeSince = now - 35_000;
  await ensurePresenceTable();

  const existing = await env.DB.prepare(
    "SELECT avatar_key, color_key FROM room_presence WHERE room_id = ? AND client_id = ?",
  ).bind(roomId, clientId).first<{ avatar_key: string; color_key: string }>();

  if (existing) {
    await env.DB.prepare("UPDATE room_presence SET last_seen = ? WHERE room_id = ? AND client_id = ?")
      .bind(now, roomId, clientId).run();
  } else {
    const active = await env.DB.prepare(
      "SELECT avatar_key, color_key FROM room_presence WHERE room_id = ? AND last_seen >= ?",
    ).bind(roomId, activeSince).all<{ avatar_key: string; color_key: string }>();
    const used = new Set(active.results.map((user: { avatar_key: string; color_key: string }) => `${user.avatar_key}:${user.color_key}`));
    const available = avatarKeys.flatMap((avatar) => colorKeys.map((color) => ({ avatar, color })))
      .filter(({ avatar, color }) => !used.has(`${avatar}:${color}`));
    const choice = available[Math.floor(Math.random() * available.length)] ?? { avatar: "bot", color: "mint" };
    await env.DB.prepare(
      "INSERT INTO room_presence (room_id, client_id, avatar_key, color_key, last_seen) VALUES (?, ?, ?, ?, ?)",
    ).bind(roomId, clientId, choice.avatar, choice.color, now).run();
  }

  await env.DB.prepare("DELETE FROM room_presence WHERE last_seen < ? AND profile_key IS NULL")
    .bind(now - 86_400_000).run();
  const users = await env.DB.prepare(
    "SELECT client_id, avatar_key, color_key, profile_id, last_seen FROM room_presence WHERE room_id = ? AND last_seen >= ? ORDER BY last_seen DESC",
  ).bind(roomId, activeSince).all<PresenceRow>();
  const room = await env.DB.prepare("SELECT item_type FROM rooms WHERE room_id = ?")
    .bind(roomId).first<{ item_type: string }>();

  return Response.json({
    itemType: room?.item_type ?? "thing",
    users: users.results.map((user: PresenceRow) => ({
      clientId: user.client_id,
      avatarKey: user.avatar_key,
      colorKey: user.color_key,
      profileUrl: user.profile_id ? `/api/profile/${user.profile_id}` : null,
      lastSeen: user.last_seen,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
