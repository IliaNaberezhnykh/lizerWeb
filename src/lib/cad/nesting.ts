import type { NestingSheet, OutlinePart, PartGroup } from "@/types/domain";
import { BLANK_DIM_MAX, BLANK_DIM_MIN, clampNumber } from "@/lib/cad/param-limits";

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
    const w = clampNumber(
      blank?.width ?? group.sample.bbox.w,
      BLANK_DIM_MIN,
      BLANK_DIM_MAX,
      group.sample.bbox.w || 800,
    );
    const h = clampNumber(
      blank?.height ?? group.sample.bbox.h,
      BLANK_DIM_MIN,
      BLANK_DIM_MAX,
      group.sample.bbox.h || 600,
    );

    for (let i = 0; i < Math.max(1, group.quantity); i += 1) {
      sheets.push({
        index: sheets.length,
        width: Number(w.toFixed(1)),
        height: Number(h.toFixed(1)),
        placements: [
          {
            partId: `${group.key}-${i}`,
            groupKey: group.key,
            x: 0,
            y: 0,
            rotationDeg: 0,
            w: Number(w.toFixed(1)),
            h: Number(h.toFixed(1)),
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
