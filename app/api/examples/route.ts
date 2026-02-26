import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const EXAMPLES_DIR = path.join(process.cwd(), "..", "examples");

export async function GET() {
  try {
    const files = fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith(".pdf"));
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
