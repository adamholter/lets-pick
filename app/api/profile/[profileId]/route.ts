import { env } from "cloudflare:workers";
import { ensurePresenceTable } from "../../_lib/presence";

export const runtime = "edge";

export async function GET(_request: Request, context: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await context.params;
  await ensurePresenceTable();
  const row = await env.DB.prepare(
    "SELECT profile_key, profile_content_type FROM room_presence WHERE profile_id = ?",
  ).bind(profileId).first<{ profile_key: string; profile_content_type: string }>();
  if (!row) return new Response("Not found", { status: 404 });
  const object = await env.PROFILE_IMAGES.get(row.profile_key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": row.profile_content_type,
      "Cache-Control": "public, max-age=300",
      "ETag": object.httpEtag,
    },
  });
}
