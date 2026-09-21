import {
  circlePolyline,
  groupParts,
  makePart,
  translate,
} from "@/lib/cad/geometry";
import type { OutlinePart } from "@/types/domain";

interface DxfVertex {
  x?: number;
  y?: number;
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
}

interface DxfDocument {
  entities?: DxfEntity[];
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
  return { points: vertices, closed: true };
}

export async function loadDxfParts(file: File, thicknessMm: number): Promise<OutlinePart[]> {
  const text = await file.text();
  const { default: DxfParser } = await import("dxf-parser");
  const parser = new DxfParser();
  const dxf = parser.parseSync(text) as DxfDocument;
  const parts: OutlinePart[] = [];
  let index = 0;

  for (const entity of dxf.entities ?? []) {
    if (entity.type === "CIRCLE" && entity.center && entity.radius) {
      index += 1;
      parts.push(
        makePart(
          `dxf-circle-${index}`,
          `Контур ${index}`,
          circlePolyline(entity.center.x, entity.center.y, entity.radius),
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
        makePart(`dxf-poly-${index}`, `Контур ${index}`, outline, [], thicknessMm),
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
