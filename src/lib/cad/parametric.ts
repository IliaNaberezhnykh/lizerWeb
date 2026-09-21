import {
  circlePolyline,
  diamondOutline,
  ellipsePolyline,
  groupParts,
  hexPolyline,
  makePart,
  pointInPolygon,
  rectOutline,
  roundedRectPolyline,
  rosetteHole,
} from "@/lib/cad/geometry";
import type {
  BlankShape,
  OutlinePart,
  ParametricParams,
  PatternKind,
  Polyline2D,
} from "@/types/domain";

function motifGrid(width: number, height: number, pitch: number, margin: number) {
  const cols = Math.max(1, Math.floor((width - margin * 2) / pitch));
  const rows = Math.max(1, Math.floor((height - margin * 2) / pitch));
  const offsetX = (width - (cols - 1) * pitch) / 2;
  const offsetY = (height - (rows - 1) * pitch) / 2;
  const cells: [number, number][] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push([offsetX + c * pitch, offsetY + r * pitch]);
    }
  }
  return { cols, rows, cells };
}

function bracketOutline(): OutlinePart["outline"] {
  return {
    closed: true,
    points: [
      [0, 0],
      [90, 0],
      [90, 22],
      [22, 22],
      [22, 70],
      [0, 70],
    ],
  };
}

export function blankOutline(
  shape: BlankShape,
  widthMm: number,
  heightMm: number,
): Polyline2D {
  const cx = widthMm / 2;
  const cy = heightMm / 2;
  switch (shape) {
    case "circle":
      return circlePolyline(cx, cy, Math.min(widthMm, heightMm) / 2, 64);
    case "oval":
      return ellipsePolyline(cx, cy, widthMm / 2, heightMm / 2);
    case "hexagon":
      return hexPolyline(cx, cy, Math.min(widthMm, heightMm) / 2);
    case "diamond":
      return diamondOutline(widthMm, heightMm);
    case "rounded":
      return roundedRectPolyline(
        0,
        0,
        widthMm,
        heightMm,
        Math.min(widthMm, heightMm) * 0.14,
      );
    default:
      return rectOutline(widthMm, heightMm);
  }
}

function holeInsideBlank(blank: Polyline2D, hole: Polyline2D) {
  const sample = hole.points.filter((_, index) => index % 4 === 0);
  return sample.every(([x, y]) => pointInPolygon(x, y, blank.points));
}

export const shapeLabels: Record<BlankShape, string> = {
  rectangle: "Прямоугольник",
  rounded: "Со скруглением",
  circle: "Круг",
  oval: "Овал",
  hexagon: "Шестигранник",
  diamond: "Ромб",
};

export function buildParametricParts(params: ParametricParams): OutlinePart[] {
  const {
    pattern,
    widthMm,
    heightMm,
    thicknessMm,
    pitchMm,
    motifSizeMm,
    quantity,
  } = params;

  if (pattern === "batch-brackets") {
    const qty = Math.max(1, Math.min(48, quantity));
    return Array.from({ length: qty }, (_, index) =>
      makePart(
        `bracket-${index + 1}`,
        "Кронштейн L 90×70",
        bracketOutline(),
        [],
        thicknessMm,
      ),
    );
  }

  const shape = params.shape ?? "rectangle";
  const outline = blankOutline(shape, widthMm, heightMm);
  const margin = Math.max(24, motifSizeMm);
  const { cells } = motifGrid(widthMm, heightMm, pitchMm, margin);
  const holes = cells
    .map(([x, y]) => {
      if (pattern === "hex") return hexPolyline(x, y, motifSizeMm / 2);
      if (pattern === "linear-grill") {
        return roundedRectPolyline(
          x - motifSizeMm * 0.7,
          y - motifSizeMm * 0.18,
          motifSizeMm * 1.4,
          motifSizeMm * 0.36,
          motifSizeMm * 0.16,
        );
      }
      if (pattern === "rosette") return rosetteHole(x, y, motifSizeMm / 2);
      return circlePolyline(x, y, motifSizeMm / 2);
    })
    .filter((hole) => holeInsideBlank(outline, hole));

  const titles: Record<PatternKind, string> = {
    rosette: `Орнамент ${shapeLabels[shape]} ${widthMm}×${heightMm}`,
    hex: `Соты ${shapeLabels[shape]} ${widthMm}×${heightMm}`,
    "linear-grill": `Решётка ${shapeLabels[shape]} ${widthMm}×${heightMm}`,
    "batch-brackets": "Кронштейн",
  };

  return [
    makePart("panel-1", titles[pattern], outline, holes, thicknessMm),
  ];
}

export const defaultParams: ParametricParams = {
  pattern: "rosette",
  shape: "rectangle",
  widthMm: 800,
  heightMm: 600,
  thicknessMm: 2,
  material: "09G2S",
  pitchMm: 90,
  motifSizeMm: 36,
  quantity: 12,
};

export function buildParametricProject(params: ParametricParams) {
  const parts = buildParametricParts(params);
  return {
    parts,
    groups: groupParts(parts),
  };
}
