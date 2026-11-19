import { createUploadSignature } from "@/src/server/modules/media/cloudinary.service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const folder = typeof body.folder === "string" ? body.folder : "gocofa";
    return Response.json(createUploadSignature(folder));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload unavailable" },
      { status: 503 },
    );
  }
}
