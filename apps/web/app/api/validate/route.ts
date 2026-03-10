import { validateConfig } from "@scalang/schema";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = validateConfig(body);

    if (result.valid) {
      return NextResponse.json(
        { valid: true, data: result.data },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        valid: false,
        errors: result.errors?.map((e) => ({
          path: e.instancePath,
          message: e.message,
        })),
      },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
