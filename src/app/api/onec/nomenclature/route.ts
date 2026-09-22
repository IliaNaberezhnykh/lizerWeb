import { NextResponse } from "next/server";
import { STOCK_NOMENCLATURE } from "@/lib/onec/catalog";
import { oneCClient } from "@/lib/onec/client";

export async function GET() {
  return NextResponse.json({
    source: oneCClient.mode === "http" ? "catalog-local" : "mock",
    items: STOCK_NOMENCLATURE,
  });
}
