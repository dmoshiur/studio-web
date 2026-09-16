import { NextResponse } from "next/server";
import { isLocalStorage, readLocalObject } from "@/lib/storage/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves media uploaded to the embedded store. Content is public by design
 * (the studio only stores publicly referenced assets here); path traversal
 * is blocked inside readLocalObject.
 */
export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  if (!isLocalStorage()) {
    return NextResponse.json({ error: "Media is served by Firebase Storage" }, { status: 404 });
  }
  const storagePath = params.path.map(decodeURIComponent).join("/");
  const file = await readLocalObject(storagePath);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.buffer.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": file.mtime.toUTCString(),
    },
  });
}
