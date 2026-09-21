"use client";

import { buildParametricProject, defaultParams, shapeLabels } from "@/lib/cad/parametric";
import { setGeometry, useProject } from "@/lib/project-store";
import type { BlankShape, MaterialGrade, PatternKind } from "@/types/domain";

const patterns: { id: PatternKind; title: string; hint: string }[] = [
  {
    id: "rosette",
    title: "Орнамент",
    hint: "Декоративный узор на одном листе",
  },
  {
    id: "hex",
    title: "Соты",
    hint: "Перфорация шестиугольниками",
  },
  {
    id: "linear-grill",
    title: "Решётка",
    hint: "Щелевая вентиляция",
  },
  {
    id: "batch-brackets",
    title: "Партия деталей",
    hint: "Одинаковые кронштейны для нестинга",
  },
];

const shapes: { id: BlankShape; hint: string }[] = [
  { id: "rectangle", hint: "Прямой лист" },
  { id: "rounded", hint: "Скруглённые углы" },
  { id: "circle", hint: "Круглая заготовка" },
  { id: "oval", hint: "Эллипс" },
  { id: "hexagon", hint: "Шестигранник" },
  { id: "diamond", hint: "Ромб" },
];

const materials: { id: MaterialGrade; label: string }[] = [
  { id: "09G2S", label: "Сталь 09Г2С" },
  { id: "AISI304", label: "Нерж. AISI 304" },
  { id: "AISI430", label: "Нерж. AISI 430" },
  { id: "ALMG3", label: "Алюминий АМг3" },
];

export function ParametricPanel() {
  const project = useProject();
  const params = { shape: "rectangle" as const, ...defaultParams, ...project.params };

  function update<K extends keyof typeof params>(key: K, value: (typeof params)[K]) {
    const next = { ...params, [key]: value };
    const built = buildParametricProject(next);
    setGeometry({
      source: "parametric",
      params: next,
      parts: built.parts,
      groups: built.groups,
    });
  }

  return (
    <div className="stack">
      <div className="pattern-grid">
        {patterns.map((pattern) => (
          <button
            key={pattern.id}
            className={params.pattern === pattern.id ? "choice active" : "choice"}
            onClick={() => update("pattern", pattern.id)}
            type="button"
          >
            <strong>{pattern.title}</strong>
            <span>{pattern.hint}</span>
          </button>
        ))}
      </div>

      {params.pattern !== "batch-brackets" ? (
        <div className="block">
          <h3>Форма заготовки</h3>
          <div className="shape-grid">
            {shapes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={params.shape === item.id ? "choice active" : "choice"}
                onClick={() => update("shape", item.id)}
              >
                <span className={`shape-icon shape-${item.id}`} aria-hidden />
                <strong>{shapeLabels[item.id]}</strong>
                <span>{item.hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <label>
        Материал
        <select
          value={params.material}
          onChange={(e) => update("material", e.target.value as MaterialGrade)}
        >
          {materials.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      {params.pattern === "batch-brackets" ? (
        <label>
          Количество деталей
          <input
            type="range"
            min={2}
            max={36}
            value={params.quantity}
            onChange={(e) => update("quantity", Number(e.target.value))}
          />
          <em>{params.quantity} шт</em>
        </label>
      ) : (
        <>
          <div className="two">
            <label>
              Ширина, мм
              <input
                type="number"
                min={120}
                autoComplete="off"
                value={params.widthMm}
                onChange={(e) => update("widthMm", Number(e.target.value))}
              />
            </label>
            <label>
              Высота, мм
              <input
                type="number"
                min={120}
                value={params.heightMm}
                onChange={(e) => update("heightMm", Number(e.target.value))}
              />
            </label>
          </div>
          <div className="two">
            <label>
              Шаг узора, мм
              <input
                type="number"
                min={24}
                value={params.pitchMm}
                onChange={(e) => update("pitchMm", Number(e.target.value))}
              />
            </label>
            <label>
              Размер мотива, мм
              <input
                type="number"
                min={8}
                value={params.motifSizeMm}
                onChange={(e) => update("motifSizeMm", Number(e.target.value))}
              />
            </label>
          </div>
        </>
      )}

      <label>
        Толщина, мм
        <input
          type="number"
          min={0.8}
          step={0.1}
          value={params.thicknessMm}
          onChange={(e) => update("thicknessMm", Number(e.target.value))}
        />
      </label>
    </div>
  );
}
