"use client";

import { NestingPreview } from "@/components/configurator/NestingPreview";
import { ParametricPanel } from "@/components/configurator/ParametricPanel";
import { PartsTable } from "@/components/configurator/PartsTable";
import { Uploader } from "@/components/configurator/Uploader";
import { formatMoney } from "@/lib/format";
import { needsMaterialSpecs, setProject, setQuote, useProject } from "@/lib/project-store";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ViewerCanvas = dynamic(
  () => import("@/components/configurator/ViewerCanvas").then((m) => m.ViewerCanvas),
  { ssr: false, loading: () => <div className="viewport-fallback">Загрузка 3D…</div> },
);

export function ConfiguratorStudio() {
  const project = useProject();
  const router = useRouter();
  const [tab, setTab] = useState<"model" | "file">("model");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project.source !== "parametric") setTab("file");
  }, [project.source, project.fileName]);

  async function quote() {
    if (needsMaterialSpecs(project)) {
      setError("После загрузки файла укажите материал и толщину");
      setTab("file");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: project.groups,
          nesting: project.nesting,
          params: project.params,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Ошибка расчёта");
      setQuote(data.quote);
      router.push("/checkout");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка расчёта");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="studio">
      <section className="viewport">
        <div className="viewport-tools">
          <span>
            {project.fileName
              ? project.fileName
              : project.source === "parametric"
                ? "Параметрическая модель"
                : project.source.toUpperCase()}
          </span>
          <label className="explode">
            Разлёт
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={project.explode}
              onChange={(e) => setProject({ explode: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="viewport-stage">
          <ViewerCanvas />
        </div>
      </section>

      <aside className="dock">
        <div className="tabs">
          <button
            type="button"
            className={tab === "model" ? "active" : ""}
            onClick={() => setTab("model")}
          >
            Смоделировать
          </button>
          <button
            type="button"
            className={tab === "file" ? "active" : ""}
            onClick={() => setTab("file")}
          >
            Загрузить файл
          </button>
        </div>

        {tab === "model" ? <ParametricPanel /> : <Uploader />}

        <div className="block">
          <h3>Разбор на части</h3>
          <PartsTable />
        </div>

        <div className="block">
          <h3>Раскрой на лист 2500×1250</h3>
          <NestingPreview />
        </div>

        {error ? <p className="error">{error}</p> : null}

        <button
          className="primary"
          type="button"
          onClick={() => void quote()}
          disabled={busy || needsMaterialSpecs(project)}
        >
          {busy
            ? "Считаем стоимость…"
            : needsMaterialSpecs(project)
              ? "Сначала укажите материал"
              : project.quote
                ? `Подтвердить ${formatMoney(project.quote.total)}`
                : "Получить цену"}
        </button>
        <p className="muted tiny">
          После расчёта откроется подтверждение цены, оформление и оплата.
        </p>
      </aside>
    </div>
  );
}
