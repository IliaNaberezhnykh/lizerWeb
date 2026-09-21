import type { OutlinePart } from "@/types/domain";
import {
  circlePolyline,
  groupParts,
  makePart,
  translate,
} from "@/lib/cad/geometry";

interface DxfVertex {
  x?: number;
  y?: number;
  z?: number;
}

interface DxfEntity {
  type: string;
  closed?: boolean;
  shape?: boolean;
  vertices?: DxfVertex[];
  center?: { x: number; y: number };
  radius?: number;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  layer?: string;
  degreeOfSplineCurve?: number;
  knotValues?: number[];
  controlPoints?: DxfVertex[];
  weights?: number[];
  periodic?: boolean;
}

interface DxfDocument {
  entities?: DxfEntity[];
  header?: Record<string, { name?: string; data?: number | string } | number | string>;
}

function unitScaleFromHeader(header: DxfDocument["header"], rawText: string) {
  // AutoCAD $INSUNITS: 1 = inches, 4 = mm, 0 = unitless
  let units: number | undefined;
  const fromHeader = header?.$INSUNITS;
  if (typeof fromHeader === "number") units = fromHeader;
  else if (fromHeader && typeof fromHeader === "object" && "data" in fromHeader) {
    units = Number(fromHeader.data);
  }
  if (units === undefined) {
    const match = rawText.match(/\$INSUNITS[\r\n]+\s*70[\r\n]+\s*(\d+)/);
    if (match) units = Number(match[1]);
  }
  if (units === 1) return 25.4; // inch → mm
  return 1;
}

function scalePoint(
  point: [number, number],
  scale: number,
): [number, number] {
  return [point[0] * scale, point[1] * scale];
}

function closedPolyline(entity: DxfEntity) {
  const vertices = (entity.vertices ?? [])
    .filter((v) => typeof v.x === "number" && typeof v.y === "number")
    .map((v) => [v.x as number, v.y as number] as [number, number]);
  if (vertices.length < 3) return null;
  const closed = Boolean(entity.closed || entity.shape);
  if (!closed) {
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 0.2) return null;
  }
  return { points: vertices, closed: true as const };
}

function findSpan(n: number, degree: number, u: number, knots: number[]) {
  if (u >= knots[n + 1]) return n;
  if (u <= knots[degree]) return degree;
  let low = degree;
  let high = n + 1;
  let mid = Math.floor((low + high) / 2);
  while (u < knots[mid] || u >= knots[mid + 1]) {
    if (u < knots[mid]) high = mid;
    else low = mid;
    mid = Math.floor((low + high) / 2);
  }
  return mid;
}

function basisFuns(span: number, u: number, degree: number, knots: number[]) {
  const N = new Array<number>(degree + 1).fill(0);
  const left = new Array<number>(degree + 1).fill(0);
  const right = new Array<number>(degree + 1).fill(0);
  N[0] = 1;
  for (let j = 1; j <= degree; j += 1) {
    left[j] = u - knots[span + 1 - j];
    right[j] = knots[span + j] - u;
    let saved = 0;
    for (let r = 0; r < j; r += 1) {
      const temp = N[r] / (right[r + 1] + left[j - r]);
      N[r] = saved + right[r + 1] * temp;
      saved = left[j - r] * temp;
    }
    N[j] = saved;
  }
  return N;
}

function sampleBSpline(
  controls: DxfVertex[],
  knots: number[],
  degree: number,
  segments: number,
  closed: boolean,
): [number, number][] | null {
  const points = controls
    .filter((p) => typeof p.x === "number" && typeof p.y === "number")
    .map((p) => ({ x: p.x as number, y: p.y as number, w: 1 }));
  if (points.length < degree + 1 || knots.length < points.length + degree + 1) {
    // Fallback: connect unique control points as polyline
    const unique: [number, number][] = [];
    for (const p of points) {
      const last = unique[unique.length - 1];
      if (!last || Math.hypot(last[0] - p.x, last[1] - p.y) > 1e-6) {
        unique.push([p.x, p.y]);
      }
    }
    if (unique.length < 3) return null;
    return unique;
  }

  const n = points.length - 1;
  const uStart = knots[degree];
  const uEnd = knots[n + 1];
  if (!(uEnd > uStart)) return null;

  const samples: [number, number][] = [];
  const count = Math.max(segments, 16);
  for (let i = 0; i < count; i += 1) {
    const t = i / (closed ? count : count - 1);
    let u = uStart + (uEnd - uStart) * t;
    if (u >= uEnd) u = uEnd - 1e-9;
    const span = findSpan(n, degree, u, knots);
    const N = basisFuns(span, u, degree, knots);
    let x = 0;
    let y = 0;
    for (let j = 0; j <= degree; j += 1) {
      const p = points[span - degree + j];
      x += N[j] * p.x;
      y += N[j] * p.y;
    }
    const last = samples[samples.length - 1];
    if (!last || Math.hypot(last[0] - x, last[1] - y) > 1e-5) {
      samples.push([x, y]);
    }
  }

  if (samples.length < 3) return null;
  if (closed) {
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 1e-4) {
      samples.push([first[0], first[1]]);
    }
  }
  return samples;
}

function splineToPolyline(entity: DxfEntity) {
  const degree = entity.degreeOfSplineCurve ?? 3;
  const knots = entity.knotValues ?? [];
  const controls = entity.controlPoints ?? [];
  const closed = Boolean(entity.closed || entity.periodic);
  const points = sampleBSpline(controls, knots, degree, 64, closed);
  if (!points) return null;
  if (!closed) {
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 0.2) return null;
  }
  // drop duplicate closing vertex for our closed polyline model
  if (
    points.length > 3 &&
    Math.hypot(
      points[0][0] - points[points.length - 1][0],
      points[0][1] - points[points.length - 1][1],
    ) < 1e-4
  ) {
    points.pop();
  }
  return { points, closed: true as const };
}

export async function loadDxfParts(file: File, thicknessMm: number): Promise<OutlinePart[]> {
  const text = await file.text();
  const { default: DxfParser } = await import("dxf-parser");
  const parser = new DxfParser();
  const dxf = parser.parseSync(text) as DxfDocument;
  const scale = unitScaleFromHeader(dxf.header, text);
  const parts: OutlinePart[] = [];
  let index = 0;

  for (const entity of dxf.entities ?? []) {
    if (entity.type === "CIRCLE" && entity.center && entity.radius) {
      index += 1;
      parts.push(
        makePart(
          `dxf-circle-${index}`,
          `Контур ${index}`,
          {
            ...circlePolyline(
              entity.center.x * scale,
              entity.center.y * scale,
              entity.radius * scale,
            ),
          },
          [],
          thicknessMm,
        ),
      );
      continue;
    }

    if (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE") {
      const outline = closedPolyline(entity);
      if (!outline) continue;
      index += 1;
      parts.push(
        makePart(
          `dxf-poly-${index}`,
          `Контур ${index}`,
          {
            closed: true,
            points: outline.points.map((p) => scalePoint(p, scale)),
          },
          [],
          thicknessMm,
        ),
      );
      continue;
    }

    if (entity.type === "SPLINE") {
      const outline = splineToPolyline(entity);
      if (!outline) continue;
      index += 1;
      parts.push(
        makePart(
          `dxf-spline-${index}`,
          `Контур ${index}`,
          {
            closed: true,
            points: outline.points.map((p) => scalePoint(p, scale)),
          },
          [],
          thicknessMm,
        ),
      );
    }
  }

  if (parts.length === 0) {
    throw new Error("В DXF не найдены замкнутые контуры для резки.");
  }

  const minX = Math.min(
    ...parts.flatMap((part) => part.outline.points.map((p) => p[0])),
  );
  const minY = Math.min(
    ...parts.flatMap((part) => part.outline.points.map((p) => p[1])),
  );

  return parts.map((part) =>
    makePart(
      part.id,
      part.name,
      translate(part.outline, -minX, -minY),
      part.holes.map((hole) => translate(hole, -minX, -minY)),
      thicknessMm,
    ),
  );
}

export function projectFromDxf(parts: OutlinePart[]) {
  return { parts, groups: groupParts(parts) };
}
