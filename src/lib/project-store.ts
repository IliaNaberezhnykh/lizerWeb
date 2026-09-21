"use client";

import { nestGroups } from "@/lib/cad/nesting";
import { buildParametricProject, defaultParams } from "@/lib/cad/parametric";
import type {
  CheckoutInfo,
  OneCDocuments,
  OutlinePart,
  ParametricParams,
  PartGroup,
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

let state: ProjectSnapshot = {
  source: "parametric",
  params: defaultParams,
  parts: initialGeometry.parts,
  groups: initialGeometry.groups,
  nesting: nestGroups(initialGeometry.groups),
  explode: 0.35,
  checkout: emptyCheckout,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setProject(next: Partial<ProjectSnapshot>) {
  state = { ...state, ...next };
  if (next.groups) {
    state = { ...state, nesting: nestGroups(next.groups) };
  }
  emit();
}

export function setGeometry(input: {
  source: ProjectSnapshot["source"];
  fileName?: string;
  params?: ParametricParams;
  parts: OutlinePart[];
  groups: PartGroup[];
}) {
  setProject({
    source: input.source,
    fileName: input.fileName,
    params: input.params ?? state.params,
    parts: input.parts,
    groups: input.groups,
    quote: undefined,
    documents: undefined,
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
