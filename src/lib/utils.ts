import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type {
  CompetenceLevel,
  BusinessRole,
  TrackCategory,
  SubmissionStatus,
  SurveyType,
  SurveyQuestionType,
  Tool,
  EventType,
} from "@prisma/client"

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

const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  SUBMITTED: "Eingereicht",
  IN_REVIEW: "In Review",
  APPROVED: "Freigegeben",
  REWORK: "Nacharbeit",
}

export function formatSubmissionStatus(status: SubmissionStatus): string {
  return SUBMISSION_STATUS_LABEL[status] ?? status
}

export function submissionStatusVariant(
  status: SubmissionStatus
): "default" | "secondary" | "success" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
      return "success"
    case "REWORK":
      return "destructive"
    case "IN_REVIEW":
      return "default"
    case "SUBMITTED":
    default:
      return "secondary"
  }
}

export function requiresWorkProduct(level: CompetenceLevel): boolean {
  return level === "L2" || level === "L3" || level === "L4"
}

const SURVEY_TYPE_LABEL: Record<SurveyType, string> = {
  BASELINE: "Baseline",
  PULSE: "Puls",
  SELF_ASSESSMENT: "Selbsteinschaetzung",
  ANNUAL: "Jahresumfrage",
}

export function formatSurveyType(type: SurveyType): string {
  return SURVEY_TYPE_LABEL[type] ?? type
}

const SURVEY_QUESTION_TYPE_LABEL: Record<SurveyQuestionType, string> = {
  LIKERT_5: "Likert (1-5)",
  OPEN_TEXT: "Freitext",
  LEVEL_SELF: "Kompetenz-Stufe",
  MULTIPLE_CHOICE: "Auswahl",
}

export function formatSurveyQuestionType(type: SurveyQuestionType): string {
  return SURVEY_QUESTION_TYPE_LABEL[type] ?? type
}

const TOOL_LABEL: Record<Tool, string> = {
  CHATGPT: "ChatGPT",
  CLAUDE: "Claude",
  OPENWEBUI: "OpenWebUI",
}

export function formatTool(tool: Tool): string {
  return TOOL_LABEL[tool] ?? tool
}

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  KURS: "Kurs-Termin",
  STAMMTISCH: "KI-Stammtisch",
  SHOWCASE: "Showcase",
  STRATEGIC_REVIEW: "Strategische Review",
  L3_COMMUNITY: "L3-Community",
}

export function formatEventType(type: EventType): string {
  return EVENT_TYPE_LABEL[type] ?? type
}
