import { findMaterial } from "@/lib/onec/catalog";
import { buildComposition, buildQuote, nestStats, quoteFromOneC } from "@/lib/pricing/quote";
import type {
  CheckoutInfo,
  NestingSheet,
  OneCDocuments,
  OneCSpecificationRef,
  ParametricParams,
  PartGroup,
  Quote,
} from "@/types/domain";

export interface CreateOneCOrderInput {
  quote: Quote;
  groups: PartGroup[];
  params: ParametricParams;
  checkout: CheckoutInfo;
  fileName?: string;
  source: string;
  nesting?: NestingSheet[];
  orderNumber?: string;
}

export interface OrderFormField {
  name: keyof CheckoutInfo;
  title: string;
  required: boolean;
  type: "string" | "text";
}

const fallbackFields: OrderFormField[] = [
  { name: "partnerName", title: "Партнер", required: true, type: "string" },
  { name: "counterpartyName", title: "Контрагент", required: true, type: "string" },
  { name: "inn", title: "ИНН", required: false, type: "string" },
  { name: "kpp", title: "КПП", required: false, type: "string" },
  { name: "phone", title: "Телефон", required: true, type: "string" },
  { name: "email", title: "Email", required: false, type: "string" },
  { name: "comment", title: "Комментарий", required: false, type: "text" },
];

let orderSeq = 17;

function baseUrl() {
  return (process.env.ONEC_BASE_URL ?? "").replace(/\/$/, "");
}

function authHeader() {
  const preset = process.env.ONEC_BASIC?.trim();
  if (preset) {
    return preset.toLowerCase().startsWith("basic ")
      ? preset
      : `Basic ${preset}`;
  }
  const user = process.env.ONEC_USER ?? "";
  const password = process.env.ONEC_PASSWORD ?? "";
  return `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
}

function describeHttpError(status: number, body: string, path: string) {
  try {
    const data = JSON.parse(body) as {
      error?: string;
      exception?: { descr?: string };
    };
    if (data.error) return data.error;
    if (data.exception?.descr) return data.exception.descr.replaceAll("\n", " ");
  } catch {
    // not JSON
  }
  if (status === 401) {
    return "1С отклонила Basic-авторизацию. Проверьте пользователя публикации.";
  }
  if (status === 404) {
    return `HTTP-сервис 1С не найден (${path}). В публикации ERP_dev_1 включите HTTP-сервисы и сервис Lizer_API с root URL lizer, затем откройте http://srv-1cweb/ERP_dev_1/hs/lizer/ping`;
  }
  const snippet = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
  return snippet || `1С вернула ${status} на ${path}`;
}

async function oneCFetch(path: string, init?: RequestInit) {
  const root = baseUrl();
  if (!root) {
    throw new Error("ONEC_BASE_URL не задан");
  }
  const url = `${root}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const raw = await response.text();
  let data: Record<string, unknown> = {};
  if (raw) {
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      if (!response.ok) {
        throw new Error(describeHttpError(response.status, raw, path));
      }
      throw new Error(`1С вернула не JSON на ${path}`);
    }
  }
  if (!response.ok || data.ok === false) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : describeHttpError(response.status, raw, path),
    );
  }
  return data;
}

function nextSiteOrderNumber() {
  orderSeq += 1;
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `LZ-${stamp}-${String(orderSeq).padStart(4, "0")}`;
}

export const oneCClient = {
  get mode() {
    return baseUrl() ? "http" : "mock";
  },
  get connected() {
    return Boolean(baseUrl());
  },
  async ping() {
    if (!baseUrl()) {
      return { ok: false, mode: "mock", error: "ONEC_BASE_URL не задан" };
    }
    const data = await oneCFetch("/ping");
    return { ok: true, mode: "http", ...data };
  },
  async fetchOrderForm(): Promise<OrderFormField[]> {
    const data = await oneCFetch("/order-form");
    const fields = Array.isArray(data.fields) ? data.fields : [];
    if (!fields.length) return fallbackFields;
    return fields.map((field: { name: string; title: string; required?: boolean; type?: string }) => ({
      name: field.name as keyof CheckoutInfo,
      title: field.title,
      required: Boolean(field.required),
      type: field.type === "text" ? "text" : "string",
    }));
  },
  async postQuote(input: {
    groups: PartGroup[];
    nesting: NestingSheet[];
    params: ParametricParams;
  }): Promise<Quote> {
    const stats = nestStats(input);
    if (!baseUrl()) {
      return buildQuote(input);
    }
    const parts = buildComposition({
      groups: input.groups,
      params: input.params,
      nesting: input.nesting,
    });
    const data = await oneCFetch("/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ parts }),
    });
    return quoteFromOneC(data, stats);
  },
  async postDocuments(input: CreateOneCOrderInput): Promise<OneCDocuments> {
    const orderNumber = input.orderNumber ?? nextSiteOrderNumber();
    if (!baseUrl()) {
      throw new Error("ONEC_BASE_URL не задан — заказ в 1С не отправить");
    }

    const material = findMaterial(input.params.material, input.params.thicknessMm);
    const parts = buildComposition({
      groups: input.groups,
      params: input.params,
      nesting: input.nesting,
    }).map((part) => {
      const line = input.quote.lines.find(
        (item) =>
          (item.key != null && item.key === part.key) ||
          item.nomenclatureCode === part.materialCode,
      );
      return {
        ...part,
        price: line?.price ?? material.price,
        amount: line?.amount ?? Math.round(material.price * part.quantity),
      };
    });

    const data = await oneCFetch("/order", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        paid: true,
        orderNumber,
        quoteId: input.quote.id,
        customer: input.checkout,
        parts,
      }),
    });

    const specifications = (data.specifications ?? []) as OneCSpecificationRef[];
    const first = specifications[0];
    return {
      customerOrderId: String(data.customerOrderId ?? ""),
      customerOrderNumber: String(data.customerOrderNumber ?? ""),
      siteOrderNumber: String(data.siteOrderNumber ?? orderNumber),
      paymentStatus: "paid",
      orderStatus: "in_work",
      message: String(data.message ?? "Оплата успешна, заказ в работе"),
      resourceSpecId: first?.specificationId ?? "",
      resourceSpecNumber: first?.specificationNumber ?? "",
      specifications,
      payload: data,
    };
  },
};
