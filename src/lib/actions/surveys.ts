"use server"

import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import {
  requireAuth,
  requireAdmin,
  requireReviewer,
} from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import {
  BusinessRole,
  CompetenceLevel,
  SurveyQuestionType,
  SurveyType,
} from "@prisma/client"

const HEATMAP_MIN_N = 5

function hashResponse(userId: string, surveyId: string, salt: string) {
  return createHash("sha256")
    .update(`${userId}:${surveyId}:${salt}`)
    .digest("hex")
}

export async function listActiveSurveysForUser() {
  const session = await requireAuth()

  const surveys = await prisma.survey.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
    },
  })

  const result = await Promise.all(
    surveys.map(async (s) => {
      const hash = hashResponse(session.user.id, s.id, s.salt)
      const existing = await prisma.surveyResponse.findUnique({
        where: { surveyId_responseHash: { surveyId: s.id, responseHash: hash } },
        select: { id: true, submittedAt: true },
      })
      return {
        id: s.id,
        type: s.type,
        title: s.title,
        description: s.description,
        questions: s.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          options: q.options as string[],
          competenceLevel: q.competenceLevel,
          sortOrder: q.sortOrder,
        })),
        alreadySubmitted: !!existing,
        submittedAt: existing?.submittedAt?.toISOString() ?? null,
      }
    })
  )

  return result
}

export async function submitSurveyResponse(
  surveyId: string,
  answers: Array<{ questionId: string; value: string }>,
  selfLevel?: CompetenceLevel | null
) {
  const session = await requireAuth()

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { questions: { select: { id: true } } },
  })
  if (!survey) return { success: false, error: "Umfrage nicht gefunden." }
  if (!survey.active) {
    return { success: false, error: "Diese Umfrage ist nicht aktiv." }
  }

  const questionIds = new Set(survey.questions.map((q) => q.id))
  const filtered = answers.filter(
    (a) => questionIds.has(a.questionId) && a.value.trim().length > 0
  )
  if (filtered.length === 0) {
    return { success: false, error: "Bitte mindestens eine Antwort ausfuellen." }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { department: true, businessRole: true },
  })

  const responseHash = hashResponse(session.user.id, survey.id, survey.salt)

  const existing = await prisma.surveyResponse.findUnique({
    where: { surveyId_responseHash: { surveyId, responseHash } },
    select: { id: true },
  })
  if (existing) {
    return { success: false, error: "Sie haben diese Umfrage bereits eingereicht." }
  }

  await prisma.surveyResponse.create({
    data: {
      surveyId,
      responseHash,
      department: user?.department ?? null,
      businessRole: user?.businessRole ?? null,
      competenceLevel: selfLevel ?? null,
      answers: {
        create: filtered.map((a) => ({
          questionId: a.questionId,
          value: a.value.trim(),
        })),
      },
    },
  })

  revalidatePath("/surveys")
  revalidatePath("/admin/heatmap")
  return { success: true }
}

export async function listSurveysAdmin() {
  await requireAdmin()
  const surveys = await prisma.survey.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { responses: true, questions: true } },
    },
  })
  return surveys.map((s) => ({
    id: s.id,
    type: s.type,
    title: s.title,
    description: s.description,
    active: s.active,
    questionCount: s._count.questions,
    responseCount: s._count.responses,
    createdAt: s.createdAt.toISOString(),
  }))
}

export async function toggleSurveyActive(surveyId: string, active: boolean) {
  await requireAdmin()
  await prisma.survey.update({ where: { id: surveyId }, data: { active } })
  revalidatePath("/admin/surveys")
  revalidatePath("/surveys")
  return { success: true }
}

export interface SurveyCreateInput {
  type: SurveyType
  title: string
  description?: string | null
  questions: Array<{
    prompt: string
    type: SurveyQuestionType
    options?: string[]
    competenceLevel?: CompetenceLevel | null
  }>
}

export async function createSurvey(input: SurveyCreateInput) {
  await requireAdmin()

  if (!input.title.trim()) {
    return { success: false, error: "Titel ist erforderlich." }
  }
  if (input.questions.length === 0) {
    return { success: false, error: "Mindestens eine Frage anlegen." }
  }

  const salt = randomBytes(16).toString("hex")

  const survey = await prisma.survey.create({
    data: {
      type: input.type,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      active: true,
      salt,
      questions: {
        create: input.questions.map((q, idx) => ({
          prompt: q.prompt.trim(),
          type: q.type,
          options: q.options ?? [],
          competenceLevel: q.competenceLevel ?? null,
          sortOrder: idx + 1,
        })),
      },
    },
  })

  revalidatePath("/admin/surveys")
  revalidatePath("/surveys")
  return { success: true, id: survey.id }
}

export type HeatmapCell = {
  key: string
  department: string | null
  businessRole: BusinessRole | null
  competenceLevel: CompetenceLevel | null
  n: number
  avgLikert: number | null
  levelCounts: Record<CompetenceLevel, number>
  belowThreshold: boolean
}

export async function getHeatmapData() {
  await requireReviewer()

  const responses = await prisma.surveyResponse.findMany({
    where: {
      survey: { type: SurveyType.SELF_ASSESSMENT },
    },
    select: {
      id: true,
      department: true,
      businessRole: true,
      competenceLevel: true,
      answers: {
        select: {
          value: true,
          question: { select: { type: true } },
        },
      },
    },
  })

  const groups = new Map<
    string,
    {
      department: string | null
      businessRole: BusinessRole | null
      n: number
      likertSum: number
      likertCount: number
      levelCounts: Record<CompetenceLevel, number>
    }
  >()

  for (const r of responses) {
    const key = `${r.department ?? "—"}|${r.businessRole ?? "—"}`
    const existing = groups.get(key) ?? {
      department: r.department ?? null,
      businessRole: r.businessRole ?? null,
      n: 0,
      likertSum: 0,
      likertCount: 0,
      levelCounts: {
        L1: 0, L2: 0, L3: 0, L4: 0, F1: 0, F2: 0, F3: 0,
      } as Record<CompetenceLevel, number>,
    }

    existing.n += 1
    if (r.competenceLevel) {
      existing.levelCounts[r.competenceLevel] += 1
    }
    for (const a of r.answers) {
      if (a.question.type === SurveyQuestionType.LIKERT_5) {
        const numeric = Number(a.value)
        if (!Number.isNaN(numeric)) {
          existing.likertSum += numeric
          existing.likertCount += 1
        }
      }
    }
    groups.set(key, existing)
  }

  const cells: HeatmapCell[] = Array.from(groups.entries()).map(
    ([key, g]) => ({
      key,
      department: g.department,
      businessRole: g.businessRole,
      competenceLevel: null,
      n: g.n,
      avgLikert: g.likertCount > 0 ? g.likertSum / g.likertCount : null,
      levelCounts: g.levelCounts,
      belowThreshold: g.n < HEATMAP_MIN_N,
    })
  )

  cells.sort((a, b) =>
    `${a.department ?? ""}${a.businessRole ?? ""}`.localeCompare(
      `${b.department ?? ""}${b.businessRole ?? ""}`
    )
  )

  return {
    cells,
    threshold: HEATMAP_MIN_N,
    totalResponses: responses.length,
  }
}
