import type { OutlinePart, PartGroup, Polyline2D } from "@/types/domain";

export function polylineLength(line: Polyline2D) {
  const pts = line.points;
  if (pts.length < 2) return 0;
  let length = 0;
  const last = line.closed ? pts.length : pts.length - 1;
  for (let i = 0; i < last; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    length += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return length;
}

export function shoelaceArea(points: [number, number][]) {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export function boundsOf(points: [number, number][]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export function circlePolyline(
  cx: number,
  cy: number,
  r: number,
  segments = 32,
): Polyline2D {
  const points: [number, number][] = [];
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return { points, closed: true };
}

export function ellipsePolyline(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  segments = 48,
): Polyline2D {
  const points: [number, number][] = [];
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    points.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return { points, closed: true };
}

export function diamondOutline(w: number, h: number): Polyline2D {
  return {
    closed: true,
    points: [
      [w / 2, 0],
      [w, h / 2],
      [w / 2, h],
      [0, h / 2],
    ],
  };
}

export function hexPolyline(
  cx: number,
  cy: number,
  r: number,
): Polyline2D {
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return { points, closed: true };
}

export function roundedRectPolyline(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): Polyline2D {
  const radius = Math.min(r, w / 2, h / 2);
  const points: [number, number][] = [
    [x + radius, y],
    [x + w - radius, y],
    [x + w, y + radius],
    [x + w, y + h - radius],
    [x + w - radius, y + h],
    [x + radius, y + h],
    [x, y + h - radius],
    [x, y + radius],
  ];
  return { points, closed: true };
}

export function rosetteHole(
  cx: number,
  cy: number,
  r: number,
): Polyline2D {
  const points: [number, number][] = [];
  const petals = 6;
  for (let i = 0; i <= 72; i += 1) {
    const t = (i / 72) * Math.PI * 2;
    const k = 0.62 + 0.38 * Math.cos(petals * t);
    points.push([cx + Math.cos(t) * r * k, cy + Math.sin(t) * r * k]);
  }
  return { points, closed: true };
}

export function rectOutline(w: number, h: number): Polyline2D {
  return {
    points: [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ],
    closed: true,
  };
}

export function pointInPolygon(x: number, y: number, points: [number, number][]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function translate(line: Polyline2D, dx: number, dy: number): Polyline2D {
  return {
    closed: line.closed,
    points: line.points.map(([x, y]) => [x + dx, y + dy]),
  };
}

export function measurePart(
  outline: Polyline2D,
  holes: Polyline2D[],
  thicknessMm: number,
) {
  const area =
    shoelaceArea(outline.points) -
    holes.reduce((sum, hole) => sum + shoelaceArea(hole.points), 0);
  const cutLength =
    polylineLength(outline) +
    holes.reduce((sum, hole) => sum + polylineLength(hole), 0);
  const box = boundsOf(outline.points);
  return {
    areaMm2: Math.max(area, 0),
    cutLengthMm: cutLength,
    bbox: { w: box.w, h: box.h, d: thicknessMm },
  };
}

export function makePart(
  id: string,
  name: string,
  outline: Polyline2D,
  holes: Polyline2D[],
  thicknessMm: number,
  mesh?: OutlinePart["mesh"],
): OutlinePart {
  const metrics = measurePart(outline, holes, thicknessMm);
  return { id, name, outline, holes, thicknessMm, mesh, ...metrics };
}

export function groupKeyFor(part: OutlinePart) {
  const w = Math.round(part.bbox.w * 2) / 2;
  const h = Math.round(part.bbox.h * 2) / 2;
  const d = Math.round(part.thicknessMm * 2) / 2;
  const area = Math.round(part.areaMm2);
  const cut = Math.round(part.cutLengthMm);
  return `${w}x${h}x${d}-${area}-${cut}`;
}

export function groupParts(parts: OutlinePart[]): PartGroup[] {
  const map = new Map<string, PartGroup>();
  for (const part of parts) {
    const key = groupKeyFor(part);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += 1;
    } else {
      map.set(key, {
        key,
        name: part.name,
        quantity: 1,
        sample: part,
      });
    }
  }
  return [...map.values()];
}
