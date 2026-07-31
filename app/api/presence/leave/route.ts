import { env } from "cloudflare:workers";
import { ensurePresenceTable, validIdentity } from "../../_lib/presence";

export const runtime = "edge";

export async function POST(request: Request) {
  const body = JSON.parse(await request.text().catch(() => "null")) as { roomId?: unknown; clientId?: unknown } | null;
  if (!body || !validIdentity(body.roomId, body.clientId)) return new Response(null, { status: 400 });
  await ensurePresenceTable();
  await env.DB.prepare("UPDATE room_presence SET last_seen = 0 WHERE room_id = ? AND client_id = ?")
    .bind(body.roomId, body.clientId).run();
  return new Response(null, { status: 204 });
}
