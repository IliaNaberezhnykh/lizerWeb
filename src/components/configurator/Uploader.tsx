"use client";

import { projectFromDxf, loadDxfParts } from "@/lib/cad/dxf";
import { detectFileKind, stepPlaceholder } from "@/lib/cad/kernel";
import { groupParts } from "@/lib/cad/geometry";
import { loadStlParts } from "@/lib/cad/stl";
import { setGeometry, useProject } from "@/lib/project-store";
import { useState } from "react";

export function Uploader() {
  const project = useProject();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function ingest(file: File) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const kind = detectFileKind(file.name);
      const thickness = project.params.thicknessMm;

      if (kind === "stl") {
        const parts = await loadStlParts(file);
        if (!parts.length) throw new Error("Не удалось выделить тела в STL.");
        setGeometry({
          source: "stl",
          fileName: file.name,
          parts,
          groups: groupParts(parts),
        });
        setNote(
          `STL разобран на ${parts.length} тел. Одинаковые габариты схлопнуты в количество.`,
        );
        return;
      }

      if (kind === "dxf" || kind === "dtf") {
        const parts = await loadDxfParts(file, thickness);
        const built = projectFromDxf(parts);
        setGeometry({
          source: kind,
          fileName: file.name,
          parts: built.parts,
          groups: built.groups,
        });
        setNote(
          kind === "dtf"
            ? "DTF принят как контурный чертёж (как DXF). Для печати DTF это другой пайплайн."
            : `Найдено контуров: ${built.parts.length}.`,
        );
        return;
      }

      const parts = stepPlaceholder(file.name, thickness);
      setGeometry({
        source: "step",
        fileName: file.name,
        parts,
        groups: groupParts(parts),
      });
      setNote(
        "STEP подключится через OpenCascade.js / replicad. Сейчас показана габаритная заготовка.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось прочитать файл");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <label
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) void ingest(file);
        }}
      >
        <input
          type="file"
          accept=".stl,.dxf,.dtf,.step,.stp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void ingest(file);
          }}
        />
        <strong>{busy ? "Разбираем модель…" : "Перетащите STL, DXF или STEP"}</strong>
        <span>Или нажмите, чтобы выбрать файл. DTF читается как контурный чертёж.</span>
      </label>
      <button
        type="button"
        className="ghost"
        onClick={async () => {
          const response = await fetch("/demo/ornament.dxf");
          const blob = await response.blob();
          await ingest(new File([blob], "ornament.dxf", { type: "image/vnd.dxf" }));
        }}
      >
        Загрузить демо-DXF
      </button>
      {note ? <p className="note">{note}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
