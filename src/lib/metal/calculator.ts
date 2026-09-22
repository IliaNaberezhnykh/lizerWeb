import type { MaterialGrade } from "@/types/domain";

/** Плотности по ГОСТ/практике, кг/м³ */
export const MATERIAL_DENSITY: Record<MaterialGrade, number> = {
  "09G2S": 7850,
  AISI304: 7900,
  AISI430: 7750,
  ALMG3: 2660,
};

export function densityForMaterial(material: MaterialGrade | string): number {
  if (material in MATERIAL_DENSITY) {
    return MATERIAL_DENSITY[material as MaterialGrade];
  }
  const code = material.toUpperCase();
  if (code.includes("09") || code.includes("Г2С") || code.includes("G2S")) {
    return 7850;
  }
  if (code.includes("304")) return 7900;
  if (code.includes("430")) return 7750;
  if (code.includes("АМГ") || code.includes("ALMG") || code.includes("АЛЮМ")) {
    return 2660;
  }
  return 7850;
}

/**
 * Масса листа, кг.
 * m = площадь(м²) × толщина(мм) × плотность(кг/м³) / 1000
 * эквивалент: L(м)×W(м)×t(м)×ρ
 */
export function sheetMassKg(input: {
  areaMm2: number;
  thicknessMm: number;
  material: MaterialGrade | string;
}): number {
  const areaM2 = Math.max(0, input.areaMm2) / 1_000_000;
  const thicknessMm = Math.max(0, input.thicknessMm);
  const density = densityForMaterial(input.material);
  return Number(((areaM2 * thicknessMm * density) / 1000).toFixed(3));
}

/** Площадь прямоугольной заготовки, мм² */
export function blankAreaMm2(widthMm: number, heightMm: number): number {
  return Math.max(0, widthMm) * Math.max(0, heightMm);
}
