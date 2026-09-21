import { NextResponse } from "next/server";
import { oneCClient } from "@/lib/onec/client";
import type {
  NestingSheet,
  ParametricParams,
  PartGroup,
} from "@/types/domain";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    groups: PartGroup[];
    nesting: NestingSheet[];
    params: ParametricParams;
  };

  if (!body.groups?.length) {
    return NextResponse.json(
      { error: "Нет деталей для расчёта" },
      { status: 400 },
    );
  }

  try {
    const quote = await oneCClient.postQuote(body);
    return NextResponse.json({ quote, source: oneCClient.mode });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка расчёта" },
      { status: 502 },
    );
  }
}
