import type { ParametricParams } from "@/types/domain";

/** Ширина/высота — не больше 4 цифр; иначе геометрия и раскрой валят вкладку. */
export const BLANK_DIM_MAX = 9_999;
export const BLANK_DIM_MIN = 120;

export const PARAM_LIMITS = {
  widthMm: { min: BLANK_DIM_MIN, max: BLANK_DIM_MAX },
  heightMm: { min: BLANK_DIM_MIN, max: BLANK_DIM_MAX },
  thicknessMm: { min: 0.8, max: 999 },
  pitchMm: { min: 24, max: 5_000 },
  motifSizeMm: { min: 8, max: 5_000 },
  quantity: { min: 1, max: 36 },
} as const;

const MAX_MOTIF_CELLS = 2_500;

export function clampNumber(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Обрезает ввод до 4 цифр целой части (9999). */
export function parseDimInput(raw: string, fallback: number): number {
  const digits = raw.replace(/[^\d]/g, "").slice(0, 4);
  if (!digits) return fallback;
  const n = Number(digits);
  if (!Number.isFinite(n)) return fallback;
  return clampNumber(n, BLANK_DIM_MIN, BLANK_DIM_MAX, fallback);
}

/** Обрезает толщину до 3 цифр целой части (999), дробь до 1 знака. */
export function parseThicknessInput(raw: string, fallback: number): number {
  const normalized = raw.replace(",", ".").replace(/[^\d.]/g, "");
  const [intPartRaw = "", fracPartRaw = ""] = normalized.split(".");
  const intPart = intPartRaw.slice(0, 3);
  const fracPart = fracPartRaw.slice(0, 1);
  if (!intPart && !fracPart) return fallback;
  const n = Number(fracPart ? `${intPart || "0"}.${fracPart}` : intPart);
  if (!Number.isFinite(n)) return fallback;
  return clampNumber(
    n,
    PARAM_LIMITS.thicknessMm.min,
    PARAM_LIMITS.thicknessMm.max,
    fallback,
  );
}

export function clampParametricParams(params: ParametricParams): ParametricParams {
  const widthMm = clampNumber(
    params.widthMm,
    PARAM_LIMITS.widthMm.min,
    PARAM_LIMITS.widthMm.max,
    800,
  );
  const heightMm = clampNumber(
    params.heightMm,
    PARAM_LIMITS.heightMm.min,
    PARAM_LIMITS.heightMm.max,
    600,
  );
  const thicknessMm = clampNumber(
    params.thicknessMm,
    PARAM_LIMITS.thicknessMm.min,
    PARAM_LIMITS.thicknessMm.max,
    2,
  );
  const pitchMm = clampNumber(
    params.pitchMm,
    PARAM_LIMITS.pitchMm.min,
    PARAM_LIMITS.pitchMm.max,
    90,
  );
  const motifSizeMm = clampNumber(
    params.motifSizeMm,
    PARAM_LIMITS.motifSizeMm.min,
    Math.min(PARAM_LIMITS.motifSizeMm.max, Math.min(widthMm, heightMm) / 2),
    36,
  );
  const quantity = Math.round(
    clampNumber(
      params.quantity,
      PARAM_LIMITS.quantity.min,
      PARAM_LIMITS.quantity.max,
      12,
    ),
  );

  return {
    ...params,
    widthMm,
    heightMm,
    thicknessMm,
    pitchMm,
    motifSizeMm,
    quantity,
  };
}

/** Не даём сетке узора раздуться на огромной заготовке. */
export function safeMotifPitch(
  width: number,
  height: number,
  pitch: number,
  margin: number,
): number {
  const usableW = Math.max(1, width - margin * 2);
  const usableH = Math.max(1, height - margin * 2);
  let p = Math.max(1, pitch);
  let cols = Math.max(1, Math.floor(usableW / p));
  let rows = Math.max(1, Math.floor(usableH / p));
  while (cols * rows > MAX_MOTIF_CELLS) {
    p *= 1.25;
    cols = Math.max(1, Math.floor(usableW / p));
    rows = Math.max(1, Math.floor(usableH / p));
  }
  return p;
}
