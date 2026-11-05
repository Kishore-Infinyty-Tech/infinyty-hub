import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export interface PendingMilestone {
  id: number;
  user_id: number;
  post_id: number | null;
  title: string;
  category: string;
  impact: string | null;
  status: "pending" | "approved" | "rejected";
  manager_comment: string | null;
  achieved_on: string;
  created_at: string;
  employee_name: string;
  employee_title: string | null;
  employee_department: string | null;
  employee_avatar: string | null;
  manager_id: number | null;
  manager_name: string | null;
  post_title: string | null;
  post_body: string | null;
  post_images: string[];
  post_image_url: string | null;
  post_author_name: string | null;
  post_published_at: string | null;
}

export async function GET() {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  if (me.role === "employee") return fail("Managers and HR only", 403);

  const isGlobalModerator = me.role === "hr_admin" || me.role === "founder";
  const where = isGlobalModerator
    ? "a.status = 'pending'"
    : "a.status = 'pending' and u.manager_id = $1";
  const params = isGlobalModerator ? [] : [me.id];

  const milestones = await q<PendingMilestone>(
    `select a.id, a.user_id, a.post_id, a.title, a.category, a.impact, a.status,
            a.manager_comment, a.achieved_on, a.created_at,
            u.name as employee_name, u.title as employee_title, u.department as employee_department,
            u.avatar_url as employee_avatar, u.manager_id,
            m.name as manager_name,
            p.title as post_title, p.body as post_body, p.images as post_images,
            p.image_url as post_image_url, p.author_name as post_author_name,
            p.published_at as post_published_at
       from portal.achievements a
       join portal.users u on u.id = a.user_id
       left join portal.users m on m.id = u.manager_id
       left join portal.posts p on p.id = a.post_id
      where ${where}
      order by a.created_at desc`,
    params,
  );

  return json({
    milestones: milestones.map((m) => ({
      ...m,
      post_images: m.post_images ?? (m.post_image_url ? [m.post_image_url] : []),
    })),
  });
}

