"use client";

import { formatArea, formatMeters, formatMm, formatNumber } from "@/lib/format";
import { sheetMassKg } from "@/lib/metal/calculator";
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
            <th>Масса</th>
          </tr>
        </thead>
        <tbody>
          {project.groups.map((group) => {
            const massKg =
              sheetMassKg({
                areaMm2: group.sample.areaMm2,
                thicknessMm: group.sample.thicknessMm,
                material: project.params.material,
              }) * group.quantity;
            return (
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
                <td>{formatArea(group.sample.areaMm2 * group.quantity)}</td>
                <td>{formatNumber(massKg, 3)} кг</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
