"use client";

import { groupParts, makePart } from "@/lib/cad/geometry";
import { nestGroups } from "@/lib/cad/nesting";
import { BLANK_DIM_MAX, BLANK_DIM_MIN, clampNumber } from "@/lib/cad/param-limits";
import { buildParametricProject, defaultParams } from "@/lib/cad/parametric";
import type {
  CheckoutInfo,
  OneCDocuments,
  OutlinePart,
  ParametricParams,
  ProjectSnapshot,
  Quote,
} from "@/types/domain";
import { useSyncExternalStore } from "react";

const emptyCheckout: CheckoutInfo = {
  partnerName: "",
  counterpartyName: "",
  inn: "",
  kpp: "",
  phone: "",
  email: "",
  comment: "",
};

const initialGeometry = buildParametricProject(defaultParams);

function nestingFor(
  groups: ProjectSnapshot["groups"],
  params: ParametricParams,
  source: ProjectSnapshot["source"],
) {
  // Параметрика: лист раскроя = ширина/высота из формы.
  // Файл: лист = габарит детали.
  if (source === "parametric") {
    return nestGroups(groups, {
      width: clampNumber(params.widthMm, BLANK_DIM_MIN, BLANK_DIM_MAX, 800),
      height: clampNumber(params.heightMm, BLANK_DIM_MIN, BLANK_DIM_MAX, 600),
    });
  }
  return nestGroups(groups);
}

let state: ProjectSnapshot = {
  source: "parametric",
  params: defaultParams,
  parts: initialGeometry.parts,
  groups: initialGeometry.groups,
  nesting: nestingFor(initialGeometry.groups, defaultParams, "parametric"),
  explode: 0.35,
  specsConfirmed: true,
  checkout: emptyCheckout,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setProject(next: Partial<ProjectSnapshot>) {
  const groups = next.groups ?? state.groups;
  const params = next.params ?? state.params;
  const source = next.source ?? state.source;
  const shouldRenest =
    next.groups !== undefined ||
    next.params !== undefined ||
    next.source !== undefined;

  state = {
    ...state,
    ...next,
    nesting: shouldRenest
      ? nestingFor(groups, params, source)
      : (next.nesting ?? state.nesting),
  };
  emit();
}

export function setGeometry(input: {
  source: ProjectSnapshot["source"];
  fileName?: string;
  params?: ParametricParams;
  parts: OutlinePart[];
  groups: PartGroupLike[];
  specsConfirmed?: boolean;
}) {
  const fromFile = input.source !== "parametric";
  setProject({
    source: input.source,
    fileName: input.fileName,
    params: input.params ?? state.params,
    parts: input.parts,
    groups: input.groups,
    selectedGroupKey: undefined,
    specsConfirmed: input.specsConfirmed ?? !fromFile,
    quote: undefined,
    documents: undefined,
  });
}

type PartGroupLike = ProjectSnapshot["groups"][number];

export function applyFileMaterialSpecs(input: {
  material: ParametricParams["material"];
  thicknessMm: number;
}) {
  const thicknessMm = Number(input.thicknessMm);
  if (!Number.isFinite(thicknessMm) || thicknessMm <= 0) {
    throw new Error("Укажите толщину больше 0");
  }
  const parts = state.parts.map((part) =>
    makePart(part.id, part.name, part.outline, part.holes, thicknessMm, part.mesh),
  );
  setProject({
    params: {
      ...state.params,
      material: input.material,
      thicknessMm,
    },
    parts,
    groups: groupParts(parts),
    specsConfirmed: true,
    quote: undefined,
  });
}

export function setQuote(quote: Quote) {
  setProject({ quote });
}

export function setCheckout(checkout: CheckoutInfo) {
  setProject({ checkout });
}

export function setDocuments(documents: OneCDocuments) {
  setProject({ documents });
}

export function getProject() {
  return state;
}

export function needsMaterialSpecs(snapshot: ProjectSnapshot = state) {
  return snapshot.source !== "parametric" && !snapshot.specsConfirmed;
}

export function useProject() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}
