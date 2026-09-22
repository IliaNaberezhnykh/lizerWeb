"use client";

import { buildParametricProject, defaultParams, shapeLabels } from "@/lib/cad/parametric";
import {
  BLANK_DIM_MAX,
  BLANK_DIM_MIN,
  PARAM_LIMITS,
  clampNumber,
  clampParametricParams,
} from "@/lib/cad/param-limits";
import { MATERIALS } from "@/lib/materials";
import { setGeometry, useProject } from "@/lib/project-store";
import type { BlankShape, MaterialGrade, PatternKind, ParametricParams } from "@/types/domain";
import { useEffect, useState } from "react";

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

function digitsOnly(raw: string, maxLen: number) {
  return raw.replace(/[^\d]/g, "").slice(0, maxLen);
}

function thicknessDraft(raw: string) {
  const normalized = raw.replace(",", ".").replace(/[^\d.]/g, "");
  const parts = normalized.split(".");
  const intPart = (parts[0] ?? "").slice(0, 3);
  const fracPart = (parts[1] ?? "").slice(0, 1);
  if (parts.length > 1) return `${intPart}.${fracPart}`;
  return intPart;
}

export function ParametricPanel() {
  const project = useProject();
  const params = clampParametricParams({
    ...defaultParams,
    ...project.params,
  });

  const [widthDraft, setWidthDraft] = useState(String(params.widthMm));
  const [heightDraft, setHeightDraft] = useState(String(params.heightMm));
  const [thicknessDraftValue, setThicknessDraftValue] = useState(
    String(params.thicknessMm),
  );

  useEffect(() => {
    setWidthDraft(String(params.widthMm));
    setHeightDraft(String(params.heightMm));
    setThicknessDraftValue(String(params.thicknessMm));
  }, [params.widthMm, params.heightMm, params.thicknessMm]);

  function commit(nextRaw: ParametricParams) {
    const next = clampParametricParams(nextRaw);
    const built = buildParametricProject(next);
    setGeometry({
      source: "parametric",
      params: built.params ?? next,
      parts: built.parts,
      groups: built.groups,
    });
  }

  function update<K extends keyof ParametricParams>(
    key: K,
    value: ParametricParams[K],
  ) {
    commit({ ...params, [key]: value });
  }

  function commitDim(key: "widthMm" | "heightMm", draft: string) {
    const n = Number(draft);
    const fallback = params[key];
    const value = Number.isFinite(n)
      ? clampNumber(n, BLANK_DIM_MIN, BLANK_DIM_MAX, fallback)
      : fallback;
    if (key === "widthMm") setWidthDraft(String(value));
    else setHeightDraft(String(value));
    update(key, value);
  }

  function commitThickness(draft: string) {
    const n = Number(draft.replace(",", "."));
    const value = Number.isFinite(n)
      ? clampNumber(
          n,
          PARAM_LIMITS.thicknessMm.min,
          PARAM_LIMITS.thicknessMm.max,
          params.thicknessMm,
        )
      : params.thicknessMm;
    setThicknessDraftValue(String(value));
    update("thicknessMm", value);
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
          {MATERIALS.map((item) => (
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
            min={PARAM_LIMITS.quantity.min}
            max={PARAM_LIMITS.quantity.max}
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="off"
                value={widthDraft}
                onChange={(e) => setWidthDraft(digitsOnly(e.target.value, 4))}
                onBlur={() => commitDim("widthMm", widthDraft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
            </label>
            <label>
              Высота, мм
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="off"
                value={heightDraft}
                onChange={(e) => setHeightDraft(digitsOnly(e.target.value, 4))}
                onBlur={() => commitDim("heightMm", heightDraft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
            </label>
          </div>
          <p className="muted tiny">
            Ширина и высота — от {BLANK_DIM_MIN} до {BLANK_DIM_MAX} мм (не больше 4
            цифр). Значение применится при выходе из поля.
          </p>
          <div className="two">
            <label>
              Шаг узора, мм
              <input
                type="number"
                min={PARAM_LIMITS.pitchMm.min}
                max={PARAM_LIMITS.pitchMm.max}
                value={params.pitchMm}
                onChange={(e) =>
                  update(
                    "pitchMm",
                    clampNumber(
                      Number(e.target.value),
                      PARAM_LIMITS.pitchMm.min,
                      PARAM_LIMITS.pitchMm.max,
                      params.pitchMm,
                    ),
                  )
                }
              />
            </label>
            <label>
              Размер мотива, мм
              <input
                type="number"
                min={PARAM_LIMITS.motifSizeMm.min}
                max={PARAM_LIMITS.motifSizeMm.max}
                value={params.motifSizeMm}
                onChange={(e) =>
                  update(
                    "motifSizeMm",
                    clampNumber(
                      Number(e.target.value),
                      PARAM_LIMITS.motifSizeMm.min,
                      PARAM_LIMITS.motifSizeMm.max,
                      params.motifSizeMm,
                    ),
                  )
                }
              />
            </label>
          </div>
        </>
      )}

      <label>
        Толщина, мм
        <input
          type="text"
          inputMode="decimal"
          maxLength={5}
          autoComplete="off"
          value={thicknessDraftValue}
          onChange={(e) => setThicknessDraftValue(thicknessDraft(e.target.value))}
          onBlur={() => commitThickness(thicknessDraftValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </label>
      <p className="muted tiny">
        Толщина — до 3 цифр (макс. {PARAM_LIMITS.thicknessMm.max} мм).
      </p>
    </div>
  );
}
