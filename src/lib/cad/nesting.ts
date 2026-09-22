import type { NestingSheet, OutlinePart, PartGroup } from "@/types/domain";

export const STOCK_SHEET = { width: 1500, height: 6000, gap: 8 };

export function nestGroups(groups: PartGroup[]): NestingSheet[] {
  const items = groups.flatMap((group) =>
    Array.from({ length: group.quantity }, (_, i) => ({
      partId: `${group.key}-${i}`,
      groupKey: group.key,
      w: group.sample.bbox.w,
      h: group.sample.bbox.h,
    })),
  );

  items.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

  const sheets: NestingSheet[] = [];
  for (const item of items) {
    const placed = placeOnExisting(sheets, item) || placeOnNewSheet(sheets, item);
    if (!placed) {
      sheets.push({
        index: sheets.length,
        width: STOCK_SHEET.width,
        height: STOCK_SHEET.height,
        placements: [
          {
            partId: item.partId,
            groupKey: item.groupKey,
            x: STOCK_SHEET.gap,
            y: STOCK_SHEET.gap,
            rotationDeg: 0,
            w: item.w,
            h: item.h,
          },
        ],
        utilization: 0,
      });
    }
  }

  return sheets.map((sheet, index) => {
    const used = sheet.placements.reduce((sum, p) => sum + p.w * p.h, 0);
    return {
      ...sheet,
      index,
      utilization: used / (sheet.width * sheet.height),
    };
  });
}

function placeOnExisting(
  sheets: NestingSheet[],
  item: { partId: string; groupKey: string; w: number; h: number },
) {
  for (const sheet of sheets) {
    const variants = [
      { w: item.w, h: item.h, rotationDeg: 0 },
      { w: item.h, h: item.w, rotationDeg: 90 },
    ];
    for (const variant of variants) {
      const pos = findSlot(sheet, variant.w, variant.h);
      if (pos) {
        sheet.placements.push({
          partId: item.partId,
          groupKey: item.groupKey,
          x: pos.x,
          y: pos.y,
          rotationDeg: variant.rotationDeg,
          w: variant.w,
          h: variant.h,
        });
        return true;
      }
    }
  }
  return false;
}

function placeOnNewSheet(
  sheets: NestingSheet[],
  item: { partId: string; groupKey: string; w: number; h: number },
) {
  if (item.w > STOCK_SHEET.width - STOCK_SHEET.gap * 2 || item.h > STOCK_SHEET.height - STOCK_SHEET.gap * 2) {
    return false;
  }
  sheets.push({
    index: sheets.length,
    width: STOCK_SHEET.width,
    height: STOCK_SHEET.height,
    placements: [
      {
        partId: item.partId,
        groupKey: item.groupKey,
        x: STOCK_SHEET.gap,
        y: STOCK_SHEET.gap,
        rotationDeg: 0,
        w: item.w,
        h: item.h,
      },
    ],
    utilization: 0,
  });
  return true;
}

function findSlot(sheet: NestingSheet, w: number, h: number) {
  const gap = STOCK_SHEET.gap;
  const candidates: { x: number; y: number }[] = [{ x: gap, y: gap }];
  for (const p of sheet.placements) {
    candidates.push({ x: p.x + p.w + gap, y: p.y });
    candidates.push({ x: p.x, y: p.y + p.h + gap });
  }
  for (const c of candidates) {
    if (c.x + w + gap > sheet.width || c.y + h + gap > sheet.height) continue;
    const hits = sheet.placements.some(
      (p) =>
        c.x < p.x + p.w + gap &&
        c.x + w + gap > p.x &&
        c.y < p.y + p.h + gap &&
        c.y + h + gap > p.y,
    );
    if (!hits) return c;
  }
  return null;
}

export function flattenParts(parts: OutlinePart[]) {
  return parts.map((part) => ({
    ...part,
    bbox: {
      ...part.bbox,
      d: part.thicknessMm,
    },
  }));
}
