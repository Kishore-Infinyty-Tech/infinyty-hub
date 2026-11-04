import { json, q } from "@/lib/db";

/** All apps are always listed; `accessible` is the only thing that depends on who is asking. */
export async function GET(req: Request) {
  const userId = Number(new URL(req.url).searchParams.get("userId"));
  const apps = await q(
    `select a.id, a.name, a.tagline, a.category, a.icon, a.hue, a.kind, a.url, a.featured,
            exists (select 1 from portal.app_permissions p join portal.users u on u.role = p.role
                    where p.app_id = a.id and u.id = $1) as accessible,
            (select r.status from portal.access_requests r where r.app_id = a.id and r.user_id = $1
             order by r.created_at desc limit 1) as request_status
       from portal.apps a order by a.sort`,
    [userId || 0],
  );
  return json({ apps });
}
