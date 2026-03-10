import { schema } from "@scalang/schema";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(schema, {
    headers: {
      "Content-Type": "application/schema+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
