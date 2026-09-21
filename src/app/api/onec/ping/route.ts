import { NextResponse } from "next/server";
import { oneCClient } from "@/lib/onec/client";

export async function GET() {
  try {
    const ping = await oneCClient.ping();
    return NextResponse.json(ping);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: oneCClient.mode,
        error: error instanceof Error ? error.message : "Нет связи с 1С",
      },
      { status: 502 },
    );
  }
}
