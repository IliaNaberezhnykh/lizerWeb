import type { NestingSheet, OutlinePart, PartGroup } from "@/types/domain";

export type BlankSize = { width: number; height: number };

/**
 * Раскрой = габарит заготовки.
 * Для параметрики — widthMm × heightMm из формы (обновляется при каждом изменении).
 * Для файла — bbox детали.
 */
export function nestGroups(
  groups: PartGroup[],
  blank?: BlankSize,
): NestingSheet[] {
  const sheets: NestingSheet[] = [];

  for (const group of groups) {
    const w = Math.max(
      1,
      Number((blank?.width ?? group.sample.bbox.w).toFixed(1)),
    );
    const h = Math.max(
      1,
      Number((blank?.height ?? group.sample.bbox.h).toFixed(1)),
    );

    for (let i = 0; i < Math.max(1, group.quantity); i += 1) {
      sheets.push({
        index: sheets.length,
        width: w,
        height: h,
        placements: [
          {
            partId: `${group.key}-${i}`,
            groupKey: group.key,
            x: 0,
            y: 0,
            rotationDeg: 0,
            w,
            h,
          },
        ],
        utilization: 1,
      });
    }
  }

  return sheets;
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
