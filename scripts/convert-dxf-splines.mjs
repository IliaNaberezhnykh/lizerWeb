/**
 * Convert DXF with SPLINE entities to closed LWPOLYLINE (mm).
 * Usage: node scripts/convert-dxf-splines.mjs "input.dxf" ["output.dxf"]
 */
import fs from "fs";
import path from "path";
import DxfParser from "dxf-parser";

function findSpan(n, degree, u, knots) {
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

function basisFuns(span, u, degree, knots) {
  const N = new Array(degree + 1).fill(0);
  const left = new Array(degree + 1).fill(0);
  const right = new Array(degree + 1).fill(0);
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

function sampleBSpline(controls, knots, degree, segments, closed) {
  const points = controls
    .filter((p) => typeof p.x === "number" && typeof p.y === "number")
    .map((p) => ({ x: p.x, y: p.y }));
  if (points.length < degree + 1 || knots.length < points.length + degree + 1) {
    const unique = [];
    for (const p of points) {
      const last = unique[unique.length - 1];
      if (!last || Math.hypot(last[0] - p.x, last[1] - p.y) > 1e-6) {
        unique.push([p.x, p.y]);
      }
    }
    return unique.length >= 3 ? unique : null;
  }
  const n = points.length - 1;
  const uStart = knots[degree];
  const uEnd = knots[n + 1];
  if (!(uEnd > uStart)) return null;
  const samples = [];
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
  return samples.length >= 3 ? samples : null;
}

function writeLwPolylineDxf(polylines) {
  const lines = [
    "0",
    "SECTION",
    "2",
    "HEADER",
    "9",
    "$INSUNITS",
    "70",
    "4",
    "0",
    "ENDSEC",
    "0",
    "SECTION",
    "2",
    "ENTITIES",
  ];
  for (const poly of polylines) {
    lines.push(
      "0",
      "LWPOLYLINE",
      "8",
      "0",
      "90",
      String(poly.length),
      "70",
      "1",
    );
    for (const [x, y] of poly) {
      lines.push("10", x.toFixed(6), "20", y.toFixed(6));
    }
  }
  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}

const input = process.argv[2];
if (!input) {
  console.error("Need input DXF path");
  process.exit(1);
}
const output =
  process.argv[3] ||
  input.replace(/\.dxf$/i, "") + " - polylines mm.dxf";

const text = fs.readFileSync(input, "utf8");
const dxf = new DxfParser().parseSync(text);
const units = dxf.header?.$INSUNITS ?? 0;
const scale = units === 1 ? 25.4 : 1;

const polylines = [];
for (const entity of dxf.entities || []) {
  if (entity.type !== "SPLINE") continue;
  const closed = Boolean(entity.closed || entity.periodic);
  const pts = sampleBSpline(
    entity.controlPoints || [],
    entity.knotValues || [],
    entity.degreeOfSplineCurve || 3,
    96,
    closed,
  );
  if (!pts) continue;
  polylines.push(pts.map(([x, y]) => [x * scale, y * scale]));
}

if (!polylines.length) {
  console.error("No closed SPLINE contours found");
  process.exit(2);
}

fs.writeFileSync(output, writeLwPolylineDxf(polylines), "utf8");
console.log(
  JSON.stringify(
    {
      input: path.basename(input),
      output,
      units,
      scale,
      contours: polylines.length,
      points: polylines.reduce((s, p) => s + p.length, 0),
    },
    null,
    2,
  ),
);
