"use client";

import {
  applyFileMaterialSpecs,
  needsMaterialSpecs,
  useProject,
} from "@/lib/project-store";
import { MATERIALS, THICKNESS_OPTIONS_MM } from "@/lib/materials";
import type { MaterialGrade } from "@/types/domain";
import { useEffect, useState } from "react";

export function FileMaterialForm() {
  const project = useProject();
  const required = needsMaterialSpecs(project);
  const [material, setMaterial] = useState<"" | MaterialGrade>("");
  const [thickness, setThickness] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!required) {
      setMaterial(project.params.material);
      setThickness(String(project.params.thicknessMm));
      setError(null);
      return;
    }
    setMaterial("");
    setThickness("");
    setError(null);
  }, [required, project.fileName, project.source]);

  if (project.source === "parametric") return null;

  function save() {
    setError(null);
    if (!material) {
      setError("Выберите материал");
      return;
    }
    const thicknessMm = Number(thickness);
    if (!Number.isFinite(thicknessMm) || thicknessMm <= 0) {
      setError("Укажите толщину листа");
      return;
    }
    try {
      applyFileMaterialSpecs({ material, thicknessMm });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    }
  }

  return (
    <div className={`block file-specs ${required ? "file-specs-required" : ""}`}>
      <h3>Материал и толщина</h3>
      <p className="muted tiny">
        {required
          ? "В DXF/модели нет данных о материале — укажите их, чтобы посчитать цену."
          : "Можно изменить материал или толщину для пересчёта."}
      </p>
      <label>
        Материал *
        <select
          value={material}
          onChange={(e) => setMaterial(e.target.value as "" | MaterialGrade)}
          required
        >
          <option value="" disabled>
            Выберите материал
          </option>
          {MATERIALS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Толщина, мм *
        <select
          value={thickness}
          onChange={(e) => setThickness(e.target.value)}
          required
        >
          <option value="" disabled>
            Выберите толщину
          </option>
          {THICKNESS_OPTIONS_MM.map((mm) => (
            <option key={mm} value={String(mm)}>
              {mm}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button type="button" className="primary" onClick={save}>
        {required ? "Применить и продолжить" : "Обновить материал"}
      </button>
    </div>
  );
}
