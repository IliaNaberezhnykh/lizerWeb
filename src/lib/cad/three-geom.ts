"use client";

import type { OutlinePart } from "@/types/domain";
import { useMemo } from "react";
import {
  ExtrudeGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Shape,
  Path,
  DoubleSide,
  MeshStandardMaterial,
  Color,
} from "three";

const palette = ["#e8ece1", "#d9e0cf", "#cfd8c4", "#e4e7dc", "#d3dcc8"];

function toShape(part: OutlinePart) {
  const shape = new Shape();
  part.outline.points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  for (const hole of part.holes) {
    const path = new Path();
    hole.points.forEach(([x, y], index) => {
      if (index === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });
    path.closePath();
    shape.holes.push(path);
  }
  return shape;
}

export function geometryFromPart(part: OutlinePart) {
  if (part.mesh?.positions?.length) {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(part.mesh.positions, 3),
    );
    if (part.mesh.indices?.length) {
      geometry.setIndex(part.mesh.indices);
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
  }

  const geometry = new ExtrudeGeometry(toShape(part), {
    depth: part.thicknessMm,
    bevelEnabled: false,
    curveSegments: 8,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

export function partMaterial(index: number, _selected = false) {
  return new MeshStandardMaterial({
    color: new Color(palette[index % palette.length]),
    metalness: 0.62,
    roughness: 0.28,
    side: DoubleSide,
    envMapIntensity: 1,
  });
}

export function usePartGeometries(parts: OutlinePart[]) {
  return useMemo(() => {
    const geos = parts.map((part) => geometryFromPart(part));
    return {
      geos,
      dispose: () => geos.forEach((geo) => geo.dispose()),
    };
  }, [parts]);
}
