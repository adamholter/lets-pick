import { env } from "cloudflare:workers";
import { ensurePresenceTable, validIdentity } from "../_lib/presence";

export const runtime = "edge";

type LegacyItem = { id?: unknown; text?: unknown; votes?: unknown; liked?: unknown };

const starterItems = [
  ["starter-matrix", "The Matrix", 8],
  ["starter-spirited-away", "Spirited Away", 6],
  ["starter-knives-out", "Knives Out", 5],
  ["starter-grand-budapest", "The Grand Budapest Hotel", 3],
] as const;

async function listItems(roomId: string, clientId: string) {
  const result = await env.DB.prepare(`SELECT id, text, votes,
    EXISTS(SELECT 1 FROM room_votes v WHERE v.item_id = room_items.id AND v.client_id = ?) AS liked
    FROM room_items WHERE room_id = ? ORDER BY created_at ASC`)
    .bind(clientId, roomId).all<{ id: string; text: string; votes: number; liked: number }>();
  return result.results.map((item) => ({ ...item, liked: Boolean(item.liked) }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    action?: unknown; roomId?: unknown; clientId?: unknown; text?: unknown; items?: unknown;
  } | null;
  if (!body || !validIdentity(body.roomId, body.clientId)) {
    return Response.json({ error: "Invalid room identity" }, { status: 400 });
  }
  const roomId = body.roomId as string;
  const clientId = body.clientId as string;
  await ensurePresenceTable();

  if (body.action === "import" && Array.isArray(body.items)) {
    const statements = (body.items as LegacyItem[]).slice(0, 100).flatMap((item, index) => {
      if (typeof item.text !== "string" || !item.text.trim()) return [];
      const id = String(item.id ?? `legacy-${crypto.randomUUID()}`).slice(0, 100);
      const text = item.text.trim().slice(0, 160);
      const votes = Math.max(0, Math.min(1_000_000, Number(item.votes) || 0));
      const queries = [env.DB.prepare(`INSERT INTO room_items (id, room_id, text, votes, created_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET text = excluded.text, votes = MAX(room_items.votes, excluded.votes)`)
        .bind(id, roomId, text, votes, Date.now() + index)];
      if (item.liked) {
        queries.push(env.DB.prepare("INSERT OR IGNORE INTO room_votes (room_id, item_id, client_id, created_at) VALUES (?, ?, ?, ?)")
          .bind(roomId, id, clientId, Date.now()));
      }
      return queries;
    });
    if (statements.length) await env.DB.batch(statements);
  }

  if (body.action === "add") {
    if (typeof body.text !== "string" || !body.text.trim()) {
      return Response.json({ error: "Add some text first" }, { status: 400 });
    }
    await env.DB.prepare("INSERT INTO room_items (id, room_id, text, votes, created_at) VALUES (?, ?, ?, 0, ?)")
      .bind(crypto.randomUUID(), roomId, body.text.trim().slice(0, 160), Date.now()).run();
  }

  let items = await listItems(roomId, clientId);
  if (!items.length && roomId === "friends") {
    await env.DB.batch(starterItems.map(([id, text, votes], index) => env.DB.prepare(
      "INSERT OR IGNORE INTO room_items (id, room_id, text, votes, created_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(id, roomId, text, votes, index)));
    items = await listItems(roomId, clientId);
  }
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
