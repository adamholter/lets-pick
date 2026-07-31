import { env } from "cloudflare:workers";
import { ensurePresenceTable, validIdentity } from "../_lib/presence";

export const runtime = "edge";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { roomId?: unknown; clientId?: unknown; itemId?: unknown } | null;
  if (!body || !validIdentity(body.roomId, body.clientId) || typeof body.itemId !== "string") {
    return Response.json({ error: "Invalid vote" }, { status: 400 });
  }
  await ensurePresenceTable();
  const item = await env.DB.prepare("SELECT votes FROM room_items WHERE id = ? AND room_id = ?")
    .bind(body.itemId, body.roomId).first<{ votes: number }>();
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });
  const existing = await env.DB.prepare("SELECT 1 AS found FROM room_votes WHERE item_id = ? AND client_id = ?")
    .bind(body.itemId, body.clientId).first();
  const liked = !existing;
  if (existing) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM room_votes WHERE item_id = ? AND client_id = ?").bind(body.itemId, body.clientId),
      env.DB.prepare("UPDATE room_items SET votes = MAX(0, votes - 1) WHERE id = ? AND room_id = ?").bind(body.itemId, body.roomId),
    ]);
  } else {
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO room_votes (room_id, item_id, client_id, created_at) VALUES (?, ?, ?, ?)")
        .bind(body.roomId, body.itemId, body.clientId, Date.now()),
      env.DB.prepare("UPDATE room_items SET votes = votes + 1 WHERE id = ? AND room_id = ?").bind(body.itemId, body.roomId),
    ]);
  }
  return Response.json({ itemId: body.itemId, liked, votes: Math.max(0, item.votes + (liked ? 1 : -1)) });
}
