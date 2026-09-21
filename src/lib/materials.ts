import type { MaterialGrade } from "@/types/domain";

export const MATERIALS: { id: MaterialGrade; label: string }[] = [
  { id: "09G2S", label: "Сталь 09Г2С" },
  { id: "AISI304", label: "Нерж. AISI 304" },
  { id: "AISI430", label: "Нерж. AISI 430" },
  { id: "ALMG3", label: "Алюминий АМг3" },
];

export const THICKNESS_OPTIONS_MM = [1, 1.5, 2, 3, 4, 5, 6, 8, 10];
