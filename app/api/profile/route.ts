import { env } from "cloudflare:workers";
import { ensurePresenceTable, validIdentity } from "../_lib/presence";

export const runtime = "edge";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const form = await request.formData();
  const roomId = form.get("roomId");
  const clientId = form.get("clientId");
  const file = form.get("file");
  if (!validIdentity(roomId, clientId) || !(file instanceof File)) {
    return Response.json({ error: "Invalid upload" }, { status: 400 });
  }
  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > 2_000_000) {
    return Response.json({ error: "Use a JPG, PNG, or WebP under 2 MB" }, { status: 400 });
  }
  await ensurePresenceTable();
  const current = await env.DB.prepare(
    "SELECT profile_key FROM room_presence WHERE room_id = ? AND client_id = ?",
  ).bind(roomId, clientId).first<{ profile_key: string | null }>();
  if (!current) return Response.json({ error: "Join the room before uploading" }, { status: 409 });

  const profileId = crypto.randomUUID();
  const key = `profiles/${profileId}`;
  await env.PROFILE_IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  await env.DB.prepare(
    "UPDATE room_presence SET profile_id = ?, profile_key = ?, profile_content_type = ? WHERE room_id = ? AND client_id = ?",
  ).bind(profileId, key, file.type, roomId, clientId).run();
  if (current.profile_key) await env.PROFILE_IMAGES.delete(current.profile_key);
  return Response.json({ profileUrl: `/api/profile/${profileId}` });
}
