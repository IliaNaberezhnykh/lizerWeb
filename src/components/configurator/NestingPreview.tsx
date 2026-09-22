"use client";

import { useProject } from "@/lib/project-store";

const colors = ["#8f9a63", "#c4cc9c", "#9aa78a", "#6f7a48", "#b7c0a8"];

export function NestingPreview() {
  const { nesting } = useProject();
  if (!nesting.length) return null;

  return (
    <div className="nesting">
      {nesting.map((sheet) => {
        const scale = Math.min(280 / sheet.width, 160 / sheet.height);
        return (
          <div key={sheet.index} className="sheet-card">
            <div className="sheet-head">
              <span>
                Лист {sheet.index + 1} · {sheet.width}×{sheet.height} мм
              </span>
              <span>{Math.round(sheet.utilization * 100)}%</span>
            </div>
            <svg
              viewBox={`0 0 ${sheet.width} ${sheet.height}`}
              width={Math.max(1, sheet.width * scale)}
              height={Math.max(1, sheet.height * scale)}
            >
              <rect width={sheet.width} height={sheet.height} fill="#1b2017" stroke="#4a5340" />
              {sheet.placements.map((p, i) => (
                <rect
                  key={p.partId}
                  x={p.x}
                  y={p.y}
                  width={p.w}
                  height={p.h}
                  fill={colors[i % colors.length]}
                  fillOpacity={0.78}
                  stroke="#0b0c0f"
                  strokeWidth={4}
                />
              ))}
            </svg>
          </div>
        );
      })}
    </div>
  );
}
