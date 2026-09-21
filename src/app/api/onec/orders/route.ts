import { NextResponse } from "next/server";
import { oneCClient } from "@/lib/onec/client";

export async function POST(request: Request) {
  const body = await request.json();
  const documents = await oneCClient.postDocuments(body);
  return NextResponse.json({ documents });
}
