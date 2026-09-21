import { NextResponse } from "next/server";
import { oneCClient } from "@/lib/onec/client";

export async function GET() {
  try {
    const fields = await oneCClient.fetchOrderForm();
    return NextResponse.json({ fields, source: oneCClient.mode });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось получить форму заказа из 1С",
        source: oneCClient.mode,
      },
      { status: 502 },
    );
  }
}
