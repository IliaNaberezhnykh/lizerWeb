"use client";

import { formatArea, formatMeters, formatMm } from "@/lib/format";
import { setProject, useProject } from "@/lib/project-store";

export function PartsTable() {
  const project = useProject();

  if (!project.groups.length) {
    return <p className="muted">Детали появятся после моделирования или загрузки файла.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Деталь</th>
            <th>Кол-во</th>
            <th>Габарит</th>
            <th>Контур</th>
            <th>Площадь</th>
          </tr>
        </thead>
        <tbody>
          {project.groups.map((group) => (
            <tr
              key={group.key}
              className={project.selectedGroupKey === group.key ? "selected" : ""}
              onClick={() => setProject({ selectedGroupKey: group.key })}
            >
              <td>{group.name}</td>
              <td>{group.quantity}</td>
              <td>
                {formatMm(group.sample.bbox.w)} × {formatMm(group.sample.bbox.h)} ×{" "}
                {formatMm(group.sample.thicknessMm)}
              </td>
              <td>{formatMeters(group.sample.cutLengthMm)}</td>
              <td>{formatArea(group.sample.areaMm2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
