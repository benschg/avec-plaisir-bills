import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const EXAMPLES_DIR = path.join(process.cwd(), "..", "examples");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filePath = path.join(EXAMPLES_DIR, filename);

    // Prevent path traversal
    if (!filePath.startsWith(EXAMPLES_DIR)) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString("base64");

    return NextResponse.json({ file: base64, fileName: filename });
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
