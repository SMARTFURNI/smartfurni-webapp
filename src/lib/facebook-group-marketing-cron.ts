import "server-only";

import { getDb, query } from "@/lib/db";
import { sendPushNotification } from "@/lib/pwa-server";

const FACEBOOK_GROUP_CRON_LOCK_ID = 26_072_901;

function formatVietnamDate(value: Date) {
  return value.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

async function runFacebookGroupMarketingCronUnlocked() {
  let sent = 0;
  const publishingTasks = await query<{
    id: string; assigned_staff_id: string | null; group_name: string; scheduled_at: Date; overdue: boolean;
  }>(
    `SELECT t.id, t.assigned_staff_id, g.name AS group_name, t.scheduled_at,
            (t.due_at < NOW()) AS overdue
     FROM facebook_group_publishing_tasks t
     JOIN facebook_groups g ON g.id = t.group_id
     WHERE t.deleted_at IS NULL AND t.notification_sent_at IS NULL
       AND t.assigned_staff_id IS NOT NULL
       AND t.status IN ('scheduled','due')
       AND t.scheduled_at <= NOW()
     ORDER BY t.scheduled_at LIMIT 100`,
  );
  for (const task of publishingTasks) {
    const result = await sendPushNotification({
      ownerScope: "crm",
      ownerId: task.assigned_staff_id || undefined,
      title: task.overdue ? "Nhiệm vụ đăng bài quá hạn" : "Đến giờ đăng Facebook Group",
      body: `${task.group_name} • ${formatVietnamDate(task.scheduled_at)}`,
      url: "/crm/facebook-group-marketing/tasks",
      tag: `fbg-publish-${task.id}`,
      data: { taskId: task.id, module: "facebook-group-marketing" },
      urgency: "high",
    });
    if (result.sent > 0) {
      await query(
        `UPDATE facebook_group_publishing_tasks
         SET notification_sent_at = NOW(), status = CASE WHEN due_at < NOW() THEN 'due' ELSE status END
         WHERE id = $1`,
        [task.id],
      );
      sent += result.sent;
    }
  }

  const commentChecks = await query<{
    id: string; assigned_staff_id: string | null; group_name: string; post_id: string;
  }>(
    `SELECT c.id, c.assigned_staff_id, g.name AS group_name, c.post_id
     FROM facebook_group_post_check_tasks c
     JOIN facebook_group_published_posts p ON p.id = c.post_id
     JOIN facebook_groups g ON g.id = p.group_id
     WHERE c.deleted_at IS NULL AND p.deleted_at IS NULL AND g.deleted_at IS NULL
       AND c.assigned_staff_id IS NOT NULL
       AND c.status = 'pending' AND c.notification_sent_at IS NULL AND c.due_at <= NOW()
     ORDER BY c.due_at LIMIT 100`,
  );
  for (const task of commentChecks) {
    const result = await sendPushNotification({
      ownerScope: "crm",
      ownerId: task.assigned_staff_id || undefined,
      title: "Đến giờ kiểm tra bình luận",
      body: `Kiểm tra bài đã đăng trong ${task.group_name}.`,
      url: "/crm/facebook-group-marketing/comments",
      tag: `fbg-check-${task.id}`,
      data: { checkTaskId: task.id, postId: task.post_id, module: "facebook-group-marketing" },
      urgency: "high",
    });
    if (result.sent > 0) {
      await query(
        `UPDATE facebook_group_post_check_tasks
         SET notification_sent_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL`,
        [task.id],
      );
      sent += result.sent;
    }
  }

  const rejectedPosts = await query<{
    id: string; posted_by: string | null; group_name: string;
  }>(
    `SELECT p.id, p.posted_by, g.name AS group_name
     FROM facebook_group_published_posts p
     JOIN facebook_groups g ON g.id = p.group_id
     WHERE p.deleted_at IS NULL AND p.posted_by IS NOT NULL
       AND p.moderation_status = 'rejected' AND p.notification_sent_at IS NULL
     LIMIT 100`,
  );
  for (const post of rejectedPosts) {
    const result = await sendPushNotification({
      ownerScope: "crm",
      ownerId: post.posted_by || undefined,
      title: "Bài Facebook Group bị từ chối",
      body: `Bài trong ${post.group_name} cần được kiểm tra và viết lại.`,
      url: "/crm/facebook-group-marketing/posts",
      tag: `fbg-rejected-${post.id}`,
      data: { postId: post.id, module: "facebook-group-marketing" },
      urgency: "high",
    });
    if (result.sent > 0) {
      await query(`UPDATE facebook_group_published_posts SET notification_sent_at = NOW() WHERE id = $1`, [post.id]);
      sent += result.sent;
    }
  }

  return {
    sent,
    publishingTasks: publishingTasks.length,
    commentChecks: commentChecks.length,
    rejectedPosts: rejectedPosts.length,
    ranAt: new Date().toISOString(),
  };
}

export async function runFacebookGroupMarketingCron() {
  const lockClient = await getDb().connect();
  let locked = false;
  try {
    const lockResult = await lockClient.query<{ locked: boolean }>(
      `SELECT pg_try_advisory_lock($1) AS locked`,
      [FACEBOOK_GROUP_CRON_LOCK_ID],
    );
    locked = lockResult.rows[0]?.locked === true;
    if (!locked) {
      return {
        sent: 0,
        publishingTasks: 0,
        commentChecks: 0,
        rejectedPosts: 0,
        skipped: "already-running",
        ranAt: new Date().toISOString(),
      };
    }
    return await runFacebookGroupMarketingCronUnlocked();
  } finally {
    if (locked) {
      await lockClient.query(`SELECT pg_advisory_unlock($1)`, [FACEBOOK_GROUP_CRON_LOCK_ID])
        .catch(error => console.error("[Facebook Group Marketing Cron] Không thể mở khóa:", error));
    }
    lockClient.release();
  }
}
