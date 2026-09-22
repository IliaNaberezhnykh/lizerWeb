import { MATERIALS } from "@/lib/materials";
import { findMaterial } from "@/lib/onec/catalog";
import type {
  CompositionLine,
  NestingSheet,
  ParametricParams,
  PartGroup,
  Quote,
  QuoteLine,
} from "@/types/domain";

let quoteSeq = 1001;

export function buildComposition(input: {
  groups: PartGroup[];
  params: ParametricParams;
  nesting?: NestingSheet[];
}): CompositionLine[] {
  const material = findMaterial(input.params.material, input.params.thicknessMm);
  const materialLabel =
    MATERIALS.find((item) => item.id === input.params.material)?.label ??
    input.params.material;
  return input.groups.map((group) => {
    // В 1С уходят размеры листа раскроя = заготовки (из nesting / формы).
    const sheet = input.nesting?.find((item) =>
      item.placements.some((p) => p.groupKey === group.key),
    );
    const lengthMm = Number(
      (
        sheet?.width ??
        input.params.widthMm ??
        group.sample.bbox.w
      ).toFixed(1),
    );
    const heightMm = Number(
      (
        sheet?.height ??
        input.params.heightMm ??
        group.sample.bbox.h
      ).toFixed(1),
    );
    return {
      key: group.key,
      name: group.name,
      material: input.params.material,
      materialLabel,
      materialCode: material.code,
      materialName: material.name,
      quantity: Number(
        ((group.sample.areaMm2 * group.quantity) / 1_000_000).toFixed(3),
      ),
      partQuantity: group.quantity,
      lengthMm,
      heightMm,
      partLengthMm: lengthMm,
      partHeightMm: heightMm,
      thicknessMm: input.params.thicknessMm || group.sample.thicknessMm,
    };
  });
}

export function nestStats(input: {
  groups: PartGroup[];
  nesting: NestingSheet[];
}) {
  const sheetAreaM2 = input.nesting.reduce(
    (sum, sheet) => sum + (sheet.width * sheet.height) / 1_000_000,
    0,
  );
  const usedAreaM2 = input.groups.reduce(
    (sum, group) => sum + (group.sample.areaMm2 * group.quantity) / 1_000_000,
    0,
  );
  const sheetCount = Math.max(1, input.nesting.length);
  const wastePercent =
    sheetAreaM2 === 0
      ? 0
      : Math.max(0, 1 - usedAreaM2 / sheetAreaM2) * 100;
  return {
    sheetCount,
    wastePercent: Number(wastePercent.toFixed(1)),
  };
}

export function buildQuote(input: {
  groups: PartGroup[];
  nesting: NestingSheet[];
  params: ParametricParams;
}): Quote {
  const composition = buildComposition(input);
  const stats = nestStats(input);
  const material = findMaterial(input.params.material, input.params.thicknessMm);

  const lines: QuoteLine[] = composition.map((part) => ({
    key: part.key,
    nomenclatureCode: part.materialCode,
    nomenclatureName: part.materialName,
    unit: material.unit,
    quantity: part.quantity,
    price: material.price,
    amount: Math.round(material.price * part.quantity),
    kind: "material",
    oneCKind: "nomenclature",
  }));

  const materialAmount = lines.reduce((sum, item) => sum + item.amount, 0);
  const valid = new Date();
  valid.setDate(valid.getDate() + 3);
  quoteSeq += 1;

  return {
    id: `Q-${quoteSeq}`,
    lines,
    materialAmount,
    workAmount: 0,
    total: materialAmount,
    currency: "RUB",
    validUntil: valid.toISOString(),
    wastePercent: stats.wastePercent,
    sheetCount: stats.sheetCount,
  };
}

export function quoteFromOneC(
  data: {
    quoteId?: string;
    lines?: Array<{
      key?: string;
      nomenclatureCode?: string;
      nomenclatureName?: string;
      unit?: string;
      quantity?: number;
      price?: number;
      amount?: number;
      kind?: QuoteLine["kind"];
    }>;
    materialAmount?: number;
    workAmount?: number;
    total?: number;
    validUntil?: string;
  },
  stats: { wastePercent: number; sheetCount: number },
): Quote {
  const lines: QuoteLine[] = (data.lines ?? []).map((item) => ({
    key: item.key,
    nomenclatureCode: item.nomenclatureCode ?? "",
    nomenclatureName: item.nomenclatureName ?? "",
    unit: item.unit ?? "шт",
    quantity: Number(item.quantity ?? 0),
    price: Number(item.price ?? 0),
    amount: Number(item.amount ?? 0),
    kind: item.kind ?? "material",
    oneCKind: "nomenclature",
  }));
  const materialAmount =
    data.materialAmount ??
    lines
      .filter((item) => item.kind === "material")
      .reduce((sum, item) => sum + item.amount, 0);
  const workAmount = data.workAmount ?? 0;
  const valid = data.validUntil ?? new Date(Date.now() + 3 * 86400000).toISOString();

  return {
    id: data.quoteId ?? `Q-${Date.now()}`,
    lines,
    materialAmount,
    workAmount,
    total: data.total ?? materialAmount + workAmount,
    currency: "RUB",
    validUntil: valid,
    wastePercent: stats.wastePercent,
    sheetCount: stats.sheetCount,
  };
}
