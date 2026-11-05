import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { MODERATORS, notifyEveryone } from "@/lib/posts";
import { updateLogStatus } from "@/app/api/webhooks/whatsapp/route";
import type { PostCategory } from "@/lib/types";

const CATEGORY_LABEL: Record<PostCategory, string> = {
  client_win: "Client Win",
  office_update: "Office Update",
  award: "Award",
  announcement: "Announcement",
  update: "Achievement",
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  if (!MODERATORS.includes(me.role)) return fail("HR Admins and Founders only", 403);

  const id = Number((await ctx.params).id);
  const body = await req.json().catch(() => ({}));
  const action: "publish" | "reject" = body.action;

  if (action !== "publish" && action !== "reject") {
    return fail("Action must be 'publish' or 'reject'", 400);
  }

  const [post] = await q<{ id: number; status: string; source: string; body: string; title: string | null }>(
    `select id, status, source, body, title from portal.posts where id = $1`,
    [id],
  );

  if (!post) {
    return fail("Post not found", 404);
  }

  if (action === "reject") {
    const reason = String(body.reason ?? body.note ?? "Archived during HR moderation").trim();
    await q(
      `update portal.posts
          set status = 'rejected',
              reviewed_by = $2,
              reviewed_at = now(),
              review_note = $3
        where id = $1`,
      [id, me.id, reason],
    );
    updateLogStatus(id, "rejected");
    return json({ ok: true, action: "rejected" });
  }

  // Action is publish
  const title = String(body.title ?? post.title ?? "").trim() || "Company Achievement";
  const postBody = String(body.body ?? post.body ?? "").trim();
  const category: PostCategory = body.category ?? "client_win";
  const images: string[] = Array.isArray(body.images) ? body.images.map(String) : [];
  const taggedUserIds: number[] = Array.isArray(body.tagged_user_ids) ? body.tagged_user_ids.map(Number) : [];
  const sendToPerformance: boolean = Boolean(body.send_to_performance);
  const milestoneTitle = String(body.milestone_title ?? title).trim();
  const milestoneImpact = String(body.milestone_impact ?? postBody.slice(0, 300)).trim();

  if (!postBody && images.length === 0) {
    return fail("Announcement text or at least one image is required", 400);
  }

  // Update post to published
  await q(
    `update portal.posts
        set status = 'published',
            published_at = now(),
            reviewed_by = $2,
            reviewed_at = now(),
            title = $3,
            body = $4,
            category = $5,
            image_url = $6,
            images = $7,
            tagged_user_ids = $8,
            send_to_performance = $9,
            review_note = null
      where id = $1`,
    [
      id,
      me.id,
      title,
      postBody,
      category,
      images[0] ?? null,
      images,
      taggedUserIds,
      sendToPerformance,
    ],
  );

  updateLogStatus(id, "published");

  // Broadcast to feed: notify everyone
  await notifyEveryone(me.id, "New company story", title, "/home");

  // Performance Milestone Routing:
  // If send_to_performance is checked and contributors are tagged, route to each contributor's manager
  if (sendToPerformance && taggedUserIds.length > 0) {
    const catLabel = CATEGORY_LABEL[category] ?? "Achievement";

    for (const userId of taggedUserIds) {
      // Create pending achievement
      await q(
        `insert into portal.achievements(user_id, post_id, title, category, impact, status, achieved_on, created_at)
         values($1, $2, $3, $4, $5, 'pending', current_date, now())`,
        [userId, id, milestoneTitle, catLabel, milestoneImpact || null],
      );

      // Find user and their manager
      const [u] = await q<{ name: string; manager_id: number | null }>(
        `select name, manager_id from portal.users where id = $1`,
        [userId],
      );

      if (u) {
        // Notify the employee they've been tagged and submitted for KPI review
        await q(
          `insert into portal.notifications(user_id, title, body, href)
           values($1, 'Recognised as Major Contributor', $2, '/apps/performance')`,
          [
            userId,
            `HR tagged you in "${title}". Sent to your manager for performance milestone verification!`,
          ],
        );

        // Notify direct manager for approval
        if (u.manager_id) {
          await q(
            `insert into portal.notifications(user_id, title, body, href)
             values($1, 'Performance milestone awaiting approval', $2, '/approvals')`,
            [
              u.manager_id,
              `HR flagged an achievement for ${u.name}: "${milestoneTitle}". Verify to credit KPI.`,
            ],
          );
        }
      }
    }
  } else if (taggedUserIds.length > 0) {
    // Tagged but not sent to performance tracker: simply notify tagged employees
    for (const userId of taggedUserIds) {
      await q(
        `insert into portal.notifications(user_id, title, body, href)
         values($1, 'You were tagged in a company story', $2, '/home')`,
        [userId, `HR published a story recognising your contributions: "${title}"`],
      );
    }
  }

  return json({ ok: true, action: "published", post_id: id });
}
