import type { MaterialGrade } from "@/types/domain";

export interface NomenclatureItem {
  code: string;
  name: string;
  unit: string;
  price: number;
  kind: "material" | "operation" | "service";
  thicknessMm?: number;
  material?: MaterialGrade;
  process?: "laser-cut" | "cam" | "delivery";
}

export const STOCK_NOMENCLATURE: NomenclatureItem[] = [
  {
    code: "МТ-ЛИСТ-2-09Г2С",
    name: "Лист стальной 2 мм 09Г2С",
    unit: "м²",
    price: 1850,
    kind: "material",
    thicknessMm: 2,
    material: "09G2S",
  },
  {
    code: "МТ-ЛИСТ-3-09Г2С",
    name: "Лист стальной 3 мм 09Г2С",
    unit: "м²",
    price: 2400,
    kind: "material",
    thicknessMm: 3,
    material: "09G2S",
  },
  {
    code: "МТ-ЛИСТ-2-304",
    name: "Лист нержавеющий 2 мм AISI 304",
    unit: "м²",
    price: 6200,
    kind: "material",
    thicknessMm: 2,
    material: "AISI304",
  },
  {
    code: "МТ-ЛИСТ-1.5-430",
    name: "Лист нержавеющий 1.5 мм AISI 430",
    unit: "м²",
    price: 4100,
    kind: "material",
    thicknessMm: 1.5,
    material: "AISI430",
  },
  {
    code: "МТ-ЛИСТ-2-АМг3",
    name: "Лист алюминиевый 2 мм АМг3",
    unit: "м²",
    price: 2900,
    kind: "material",
    thicknessMm: 2,
    material: "ALMG3",
  },
  {
    code: "ОП-ЛАЗЕР-2",
    name: "Лазерная резка, толщина 2 мм",
    unit: "м",
    price: 48,
    kind: "operation",
    thicknessMm: 2,
    process: "laser-cut",
  },
  {
    code: "ОП-ЛАЗЕР-3",
    name: "Лазерная резка, толщина 3 мм",
    unit: "м",
    price: 67,
    kind: "operation",
    thicknessMm: 3,
    process: "laser-cut",
  },
  {
    code: "ОП-УП",
    name: "Подготовка управляющей программы",
    unit: "контур",
    price: 420,
    kind: "operation",
    process: "cam",
  },
  {
    code: "УС-ДОСТ-МСК",
    name: "Доставка по Москве и МО",
    unit: "рейс",
    price: 1800,
    kind: "service",
    process: "delivery",
  },
  {
    code: "УС-ТК",
    name: "Отгрузка в транспортную компанию",
    unit: "место",
    price: 650,
    kind: "service",
    process: "delivery",
  },
];

export function findMaterial(material: MaterialGrade, thicknessMm: number) {
  const exact = STOCK_NOMENCLATURE.find(
    (item) => item.material === material && item.thicknessMm === thicknessMm,
  );
  if (exact) return exact;
  return (
    STOCK_NOMENCLATURE.find((item) => item.material === material) ??
    STOCK_NOMENCLATURE[0]
  );
}

export function findCutting(thicknessMm: number) {
  return (
    STOCK_NOMENCLATURE.find(
      (item) => item.process === "laser-cut" && item.thicknessMm === thicknessMm,
    ) ??
    STOCK_NOMENCLATURE.find((item) => item.process === "laser-cut")!
  );
}

export function findByProcess(process: NonNullable<NomenclatureItem["process"]>) {
  return STOCK_NOMENCLATURE.find((item) => item.process === process)!;
}
