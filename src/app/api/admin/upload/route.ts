import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/admin-only";

export async function POST(req: Request) {
  await requireAdmin();

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "ajebo-carpenter/products" },
      (err, res) => {
        if (err || !res?.secure_url) return reject(err ?? new Error("Upload failed"));
        resolve({ secure_url: res.secure_url });
      }
    );
    stream.end(bytes);
  });

  return NextResponse.json({ url: result.secure_url });
}
