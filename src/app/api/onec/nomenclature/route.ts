import { NextResponse } from "next/server";
import { STOCK_NOMENCLATURE } from "@/lib/onec/catalog";
import { oneCClient } from "@/lib/onec/client";

export async function GET() {
  try {
    const items = await oneCClient.fetchNomenclature();
    return NextResponse.json({
      source: oneCClient.mode,
      items,
    });
  } catch {
    return NextResponse.json({
      source: "mock-fallback",
      items: STOCK_NOMENCLATURE,
    });
  }
}
