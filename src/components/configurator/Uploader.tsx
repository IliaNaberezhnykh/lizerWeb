"use client";

import { FileMaterialForm } from "@/components/configurator/FileMaterialForm";
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
      // Temporary thickness for mesh build; user must confirm material/thickness after upload.
      const previewThickness = 2;

      if (kind === "stl") {
        const parts = await loadStlParts(file);
        if (!parts.length) throw new Error("Не удалось выделить тела в STL.");
        setGeometry({
          source: "stl",
          fileName: file.name,
          parts,
          groups: groupParts(parts),
          specsConfirmed: false,
        });
        setNote(
          `STL разобран на ${parts.length} тел. Укажите материал и толщину ниже.`,
        );
        return;
      }

      if (kind === "dxf" || kind === "dtf") {
        const parts = await loadDxfParts(file, previewThickness);
        const built = projectFromDxf(parts);
        setGeometry({
          source: kind,
          fileName: file.name,
          parts: built.parts,
          groups: built.groups,
          specsConfirmed: false,
        });
        setNote(
          kind === "dtf"
            ? "DTF принят как контурный чертёж. Укажите материал и толщину ниже."
            : `Найдено контуров: ${built.parts.length}. Укажите материал и толщину ниже.`,
        );
        return;
      }

      const parts = stepPlaceholder(file.name, previewThickness);
      setGeometry({
        source: "step",
        fileName: file.name,
        parts,
        groups: groupParts(parts),
        specsConfirmed: false,
      });
      setNote(
        "STEP подключится через OpenCascade.js / replicad. Укажите материал и толщину ниже.",
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
          const response = await fetch("/demo/endless-knot.dxf");
          const blob = await response.blob();
          await ingest(
            new File([blob], "endless-knot.dxf", { type: "image/vnd.dxf" }),
          );
        }}
      >
        Загрузить демо-DXF
      </button>
      {note ? <p className="note">{note}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {project.source !== "parametric" && project.parts.length > 0 ? (
        <FileMaterialForm />
      ) : null}
    </div>
  );
}
