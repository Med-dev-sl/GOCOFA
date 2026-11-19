import { getDatabaseHealth } from "@/src/server/modules/health/health.service";

export async function GET() {
  try {
    const health = await getDatabaseHealth();
    return Response.json(health);
  } catch (error) {
    return Response.json(
      {
        status: "error",
        database: "disconnected",
        message: error instanceof Error ? error.message : "Database unavailable",
      },
      { status: 503 },
    );
  }
}
