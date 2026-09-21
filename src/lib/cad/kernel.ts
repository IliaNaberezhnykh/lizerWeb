import { makePart, rectOutline } from "@/lib/cad/geometry";
import type { FileKind, OutlinePart } from "@/types/domain";

export function detectFileKind(fileName: string): FileKind {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "stl") return "stl";
  if (ext === "dxf") return "dxf";
  if (ext === "dtf") return "dtf";
  if (ext === "step" || ext === "stp") return "step";
  throw new Error(`Формат .${ext ?? "unknown"} пока не поддерживается.`);
}

export function stepPlaceholder(fileName: string, thicknessMm: number): OutlinePart[] {
  return [
    makePart(
      "step-placeholder",
      `Заготовка STEP (${fileName})`,
      rectOutline(400, 280),
      [],
      thicknessMm,
    ),
  ];
}

/**
 * Boundary for the future CAD kernel.
 * Current skeleton: Three.js Shape extrusion + STL connected components + DXF polylines.
 * Production swap: replicad / opencascade.js worker for STEP, sheet unfold and exact BOM.
 */
export const cadKernel = {
  id: "skeleton-three-dxf",
  next: "opencascade.js + replicad worker",
};
