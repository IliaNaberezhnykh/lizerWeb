import { groupParts, makePart } from "@/lib/cad/geometry";
import type { OutlinePart } from "@/types/domain";

class UnionFind {
  parent: Int32Array;
  constructor(n: number) {
    this.parent = new Int32Array(n);
    for (let i = 0; i < n; i += 1) this.parent[i] = i;
  }
  find(i: number): number {
    let p = i;
    while (this.parent[p] !== p) {
      this.parent[p] = this.parent[this.parent[p]];
      p = this.parent[p];
    }
    return p;
  }
  union(a: number, b: number) {
    const pa = this.find(a);
    const pb = this.find(b);
    if (pa !== pb) this.parent[pb] = pa;
  }
}

function weldVertices(positions: Float32Array, epsilon = 0.08) {
  const map = new Map<string, number>();
  const welded: number[] = [];
  const remap: number[] = [];
  const keyOf = (x: number, y: number, z: number) => {
    const k = 1 / epsilon;
    return `${Math.round(x * k)}|${Math.round(y * k)}|${Math.round(z * k)}`;
  };
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const key = keyOf(x, y, z);
    const existing = map.get(key);
    if (existing !== undefined) {
      remap.push(existing);
    } else {
      const index = welded.length / 3;
      map.set(key, index);
      welded.push(x, y, z);
      remap.push(index);
    }
  }
  return { welded: new Float32Array(welded), remap };
}

export function splitDisconnectedMeshes(
  positions: Float32Array,
  indices?: Uint32Array | Uint16Array | number[],
): OutlinePart[] {
  const { welded, remap } = weldVertices(positions);
  const vertexCount = welded.length / 3;
  const uf = new UnionFind(vertexCount);
  const faces: [number, number, number][] = [];

  if (indices && indices.length > 0) {
    for (let i = 0; i + 2 < indices.length; i += 3) {
      const a = remap[indices[i]];
      const b = remap[indices[i + 1]];
      const c = remap[indices[i + 2]];
      uf.union(a, b);
      uf.union(b, c);
      faces.push([a, b, c]);
    }
  } else {
    for (let i = 0; i < remap.length; i += 3) {
      const a = remap[i];
      const b = remap[i + 1];
      const c = remap[i + 2];
      uf.union(a, b);
      uf.union(b, c);
      faces.push([a, b, c]);
    }
  }

  const buckets = new Map<number, [number, number, number][]>();
  for (const face of faces) {
    const root = uf.find(face[0]);
    const list = buckets.get(root) ?? [];
    list.push(face);
    buckets.set(root, list);
  }

  const components = [...buckets.values()]
    .filter((list) => list.length >= 8)
    .sort((a, b) => b.length - a.length);

  return components.map((componentFaces, index) => {
    const used = new Map<number, number>();
    const localPositions: number[] = [];
    const localIndices: number[] = [];
    const outlinePts: [number, number][] = [];

    for (const [a, b, c] of componentFaces) {
      for (const src of [a, b, c]) {
        if (!used.has(src)) {
          used.set(src, localPositions.length / 3);
          localPositions.push(welded[src * 3], welded[src * 3 + 1], welded[src * 3 + 2]);
        }
        localIndices.push(used.get(src)!);
      }
    }

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < localPositions.length; i += 3) {
      const x = localPositions[i];
      const y = localPositions[i + 1];
      const z = localPositions[i + 2];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
      outlinePts.push([x, y]);
    }

    const w = maxX - minX;
    const h = maxY - minY;
    const d = maxZ - minZ;
    const thickness = Math.min(w, h, d) || d;
    const outline = {
      closed: true,
      points: [
        [0, 0],
        [w, 0],
        [w, h],
        [0, h],
      ] as [number, number][],
    };

    return makePart(
      `stl-part-${index + 1}`,
      `Тело ${index + 1}`,
      outline,
      [],
      Math.max(thickness, 0.5),
      { positions: localPositions, indices: localIndices },
    );
  });
}

export function decomposeMeshesToProject(parts: OutlinePart[]) {
  return {
    parts,
    groups: groupParts(parts),
  };
}
