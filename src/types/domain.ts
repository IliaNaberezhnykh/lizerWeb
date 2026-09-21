export type FileKind = "parametric" | "stl" | "dxf" | "step" | "dtf";

export type MaterialGrade = "09G2S" | "AISI304" | "AISI430" | "ALMG3";

export type PatternKind = "rosette" | "hex" | "linear-grill" | "batch-brackets";

export type BlankShape =
  | "rectangle"
  | "rounded"
  | "circle"
  | "oval"
  | "hexagon"
  | "diamond";

export type DeliveryType = "pickup" | "tk" | "courier";

export interface CompositionLine {
  key: string;
  name: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  partQuantity: number;
  thicknessMm: number;
  price?: number;
  amount?: number;
}

export interface ParametricParams {
  pattern: PatternKind;
  shape: BlankShape;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  material: MaterialGrade;
  pitchMm: number;
  motifSizeMm: number;
  quantity: number;
}

export interface Polyline2D {
  points: [number, number][];
  closed: boolean;
}

export interface OutlinePart {
  id: string;
  name: string;
  outline: Polyline2D;
  holes: Polyline2D[];
  thicknessMm: number;
  bbox: { w: number; h: number; d: number };
  areaMm2: number;
  cutLengthMm: number;
  mesh?: {
    positions: number[];
    indices?: number[];
  };
}

export interface PartGroup {
  key: string;
  name: string;
  quantity: number;
  sample: OutlinePart;
}

export interface NestPlacement {
  partId: string;
  groupKey: string;
  x: number;
  y: number;
  rotationDeg: number;
  w: number;
  h: number;
}

export interface NestingSheet {
  index: number;
  width: number;
  height: number;
  placements: NestPlacement[];
  utilization: number;
}

export interface QuoteLine {
  nomenclatureCode: string;
  nomenclatureName: string;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
  kind: "material" | "operation" | "service";
  oneCKind: "nomenclature" | "process";
}

export interface Quote {
  id: string;
  lines: QuoteLine[];
  materialAmount: number;
  workAmount: number;
  total: number;
  currency: "RUB";
  validUntil: string;
  wastePercent: number;
  sheetCount: number;
}

export interface CheckoutInfo {
  partnerName: string;
  counterpartyName: string;
  inn: string;
  kpp: string;
  phone: string;
  email: string;
  comment: string;
}

export interface OneCSpecificationRef {
  nomenclatureId: string;
  nomenclatureName: string;
  specificationId: string;
  specificationNumber: string;
  reused: boolean;
  created: boolean;
}

export interface OneCDocuments {
  customerOrderId: string;
  customerOrderNumber: string;
  siteOrderNumber: string;
  paymentStatus: "paid";
  orderStatus: "in_work";
  message: string;
  resourceSpecId: string;
  resourceSpecNumber: string;
  specifications: OneCSpecificationRef[];
  payload: Record<string, unknown>;
}

export interface ProjectSnapshot {
  source: FileKind;
  fileName?: string;
  params: ParametricParams;
  parts: OutlinePart[];
  groups: PartGroup[];
  nesting: NestingSheet[];
  selectedGroupKey?: string;
  explode: number;
  /** For DXF/STL/STEP material+thickness must be set by the user before quote. */
  specsConfirmed: boolean;
  quote?: Quote;
  checkout: CheckoutInfo;
  documents?: OneCDocuments;
}
