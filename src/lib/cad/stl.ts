import { splitDisconnectedMeshes } from "@/lib/cad/decompose";
import type { OutlinePart } from "@/types/domain";

function isAsciiStl(buffer: ArrayBuffer) {
  const head = new TextDecoder().decode(buffer.slice(0, 80)).toLowerCase();
  return head.includes("solid") && !head.includes("\0");
}

function parseAsciiStl(text: string) {
  const positions: number[] = [];
  const regex = /vertex\s+([-+eE0-9.]+)\s+([-+eE0-9.]+)\s+([-+eE0-9.]+)/g;
  for (const match of text.matchAll(regex)) {
    positions.push(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  return new Float32Array(positions);
}

function parseBinaryStl(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const triangles = view.getUint32(80, true);
  const positions = new Float32Array(triangles * 9);
  let offset = 84;
  let cursor = 0;
  for (let i = 0; i < triangles; i += 1) {
    offset += 12;
    for (let v = 0; v < 9; v += 1) {
      positions[cursor] = view.getFloat32(offset, true);
      cursor += 1;
      offset += 4;
    }
    offset += 2;
  }
  return positions;
}

function maybeScaleToMm(positions: Float32Array) {
  let max = 0;
  for (let i = 0; i < positions.length; i += 1) {
    max = Math.max(max, Math.abs(positions[i]));
  }
  if (max > 0 && max < 5) {
    for (let i = 0; i < positions.length; i += 1) positions[i] *= 1000;
  }
  return positions;
}

export async function loadStlParts(file: File): Promise<OutlinePart[]> {
  const buffer = await file.arrayBuffer();
  const positions = isAsciiStl(buffer)
    ? parseAsciiStl(new TextDecoder().decode(buffer))
    : parseBinaryStl(buffer);
  return splitDisconnectedMeshes(maybeScaleToMm(positions));
}
