import { NextResponse } from "next/server";
import { oneCClient, type CreateOneCOrderInput } from "@/lib/onec/client";
import type { NestingSheet } from "@/types/domain";

const orders = new Map<string, unknown>();

export async function POST(request: Request) {
  const body = (await request.json()) as CreateOneCOrderInput & {
    payment?: { method?: string; stub?: boolean };
    nesting?: NestingSheet[];
  };

  if (!body.checkout?.partnerName || !body.checkout?.phone) {
    return NextResponse.json(
      { error: "Заполните партнера и телефон" },
      { status: 400 },
    );
  }
  if (!body.checkout.counterpartyName) {
    return NextResponse.json(
      { error: "Заполните контрагента" },
      { status: 400 },
    );
  }

  try {
    const quote =
      body.quote ??
      (await oneCClient.postQuote({
        groups: body.groups,
        nesting: body.nesting ?? [],
        params: body.params,
      }));
    const documents = await oneCClient.postDocuments({
      ...body,
      quote,
    });

    const order = {
      id: documents.customerOrderId || documents.siteOrderNumber,
      status: documents.orderStatus,
      paidAt: new Date().toISOString(),
      message: documents.message,
      quote,
      documents,
      checkout: body.checkout,
    };
    orders.set(order.id, order);

    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось создать заказ" },
      { status: 502 },
    );
  }
}
