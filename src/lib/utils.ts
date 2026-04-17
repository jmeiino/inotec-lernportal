import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CompetenceLevel, BusinessRole, TrackCategory } from "@prisma/client"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const COMPETENCE_LEVEL_LABEL: Record<CompetenceLevel, string> = {
  L1: "L1 Basis",
  L2: "L2 Anwender",
  L3: "L3 Multiplikator",
  L4: "L4 Champion",
  F1: "F1 Sensibilisierung",
  F2: "F2 Fuehren mit KI",
  F3: "F3 GF-Dialog",
}

export function formatCompetenceLevel(level: CompetenceLevel): string {
  return COMPETENCE_LEVEL_LABEL[level] ?? level
}

const BUSINESS_ROLE_LABEL: Record<BusinessRole, string> = {
  VERTRIEB: "Vertrieb & Marketing",
  PRODUKTION: "Produktion & Technik",
  VERWALTUNG: "Verwaltung & Finanzen",
  IT: "IT & Digitalisierung",
  HR: "HR",
  FUEHRUNG: "Fuehrung",
}

export function formatBusinessRole(role: BusinessRole | null | undefined): string {
  if (!role) return "-"
  return BUSINESS_ROLE_LABEL[role] ?? role
}

const TRACK_CATEGORY_LABEL: Record<TrackCategory, string> = {
  FACH: "Fach-Track",
  FUEHRUNG: "Fuehrungs-Track",
}

export function formatTrackCategory(category: TrackCategory): string {
  return TRACK_CATEGORY_LABEL[category] ?? category
}
