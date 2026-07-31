import { env } from "cloudflare:workers";
import { ensurePresenceTable } from "../_lib/presence";

export const runtime = "edge";

const itemTypes = new Set(["thing", "song", "question", "person", "place"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { roomId?: unknown; itemType?: unknown } | null;
  if (!body || typeof body.roomId !== "string" || body.roomId.length < 1 || body.roomId.length > 300
    || typeof body.itemType !== "string" || !itemTypes.has(body.itemType)) {
    return Response.json({ error: "Invalid room setting" }, { status: 400 });
  }
  await ensurePresenceTable();
  await env.DB.prepare(`INSERT INTO rooms (room_id, item_type, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(room_id) DO UPDATE SET item_type = excluded.item_type, updated_at = excluded.updated_at`)
    .bind(body.roomId, body.itemType, Date.now()).run();
  return Response.json({ itemType: body.itemType });
}
