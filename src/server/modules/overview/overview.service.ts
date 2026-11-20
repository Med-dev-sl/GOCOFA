import { getDatabase } from "@/src/server/database/neon";

export async function getOverviewData() {
  const sql = getDatabase();

  const [userStats, recentUsers] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_users,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '24 hours')::int AS logged_in_today
      FROM users
    `,
    sql`
      SELECT
        full_name,
        username,
        role_name,
        created_at,
        last_login_at
      FROM (
        SELECT u.full_name, u.username, r.name AS role_name, u.created_at, u.last_login_at
        FROM users u
        JOIN roles r ON r.id = u.role_id
        ORDER BY u.updated_at DESC
        LIMIT 5
      ) recent
    `,
  ]);

  return {
    kpis: {
      totalUsers: userStats[0]?.total_users ?? 0,
      activeUsers: userStats[0]?.active_users ?? 0,
      loggedInToday: userStats[0]?.logged_in_today ?? 0,
    },
    recentUsers: recentUsers.map((user) => ({
      fullName: user.full_name,
      username: user.username,
      role: user.role_name,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    })),
  };
}
