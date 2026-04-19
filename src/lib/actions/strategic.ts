"use server"

import { prisma } from "@/lib/prisma"
import { requireReviewer, requireAdmin } from "@/lib/auth-guard"
import {
  CompetenceLevel,
  SubmissionStatus,
  SurveyType,
  TrackCategory,
} from "@prisma/client"
import { revalidatePath } from "next/cache"

export async function getStrategicOverview() {
  await requireReviewer()

  const [tracks, allProgress, totalUsers, submissions, decisions, surveyResponses] =
    await Promise.all([
      prisma.track.findMany({
        select: {
          id: true,
          name: true,
          competenceLevel: true,
          category: true,
          modules: { select: { id: true } },
        },
      }),
      prisma.moduleProgress.findMany({
        where: { status: "COMPLETED" },
        select: {
          userId: true,
          module: {
            select: {
              trackId: true,
              track: { select: { competenceLevel: true, category: true } },
            },
          },
        },
      }),
      prisma.user.count(),
      prisma.workProductSubmission.findMany({
        where: { status: SubmissionStatus.APPROVED, reviewedAt: { not: null } },
        select: { submittedAt: true, reviewedAt: true },
      }),
      prisma.strategicReviewDecision.findMany({
        orderBy: [{ status: "asc" }, { reviewDate: "desc" }],
      }),
      prisma.surveyResponse.findMany({
        where: { survey: { type: SurveyType.SELF_ASSESSMENT } },
        select: { competenceLevel: true },
      }),
    ])

  // Pyramide: pro Stufe Anteil User mit mind. einem completed-Modul aus dieser Stufe
  const userByLevel = new Map<CompetenceLevel, Set<string>>()
  for (const p of allProgress) {
    const lv = p.module.track.competenceLevel
    if (!userByLevel.has(lv)) userByLevel.set(lv, new Set())
    userByLevel.get(lv)!.add(p.userId)
  }

  const fachLevels: CompetenceLevel[] = ["L1", "L2", "L3", "L4"]
  const fuehrungLevels: CompetenceLevel[] = ["F1", "F2", "F3"]

  const buildPyramid = (levels: CompetenceLevel[]) =>
    levels.map((lv) => ({
      level: lv,
      reachedUsers: userByLevel.get(lv)?.size ?? 0,
      reachedPct:
        totalUsers > 0
          ? Math.round(((userByLevel.get(lv)?.size ?? 0) / totalUsers) * 100)
          : 0,
    }))

  const fachPyramid = buildPyramid(fachLevels)
  const fuehrungPyramid = buildPyramid(fuehrungLevels)

  // Submission-Trend
  const durations = submissions
    .filter((s) => s.reviewedAt)
    .map(
      (s) => (s.reviewedAt!.getTime() - s.submittedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
  const avgDays =
    durations.length > 0
      ? durations.reduce((s, v) => s + v, 0) / durations.length
      : null
  const last30 = submissions.filter(
    (s) => s.reviewedAt && Date.now() - s.reviewedAt.getTime() < 30 * 24 * 60 * 60 * 1000
  )

  const surveyByLevel = new Map<CompetenceLevel, number>()
  for (const r of surveyResponses) {
    if (r.competenceLevel) {
      surveyByLevel.set(
        r.competenceLevel,
        (surveyByLevel.get(r.competenceLevel) ?? 0) + 1
      )
    }
  }

  return {
    totalUsers,
    fachPyramid,
    fuehrungPyramid,
    submissionStats: {
      avgDurationDays: avgDays,
      approvedTotal: submissions.length,
      approvedLast30Days: last30.length,
    },
    surveySelfByLevel: Array.from(surveyByLevel.entries()).map(([lv, n]) => ({
      level: lv,
      n,
    })),
    decisions: decisions.map((d) => ({
      id: d.id,
      reviewDate: d.reviewDate.toISOString(),
      topic: d.topic,
      decision: d.decision,
      ownerId: d.ownerId,
      dueDate: d.dueDate?.toISOString() ?? null,
      status: d.status,
    })),
  }
}

export async function createStrategicDecision(data: {
  reviewDate: string
  topic: string
  decision: string
  ownerId?: string | null
  dueDate?: string | null
}) {
  await requireAdmin()
  if (!data.topic.trim() || !data.decision.trim()) {
    return { success: false, error: "Topic und Decision Pflicht." }
  }
  await prisma.strategicReviewDecision.create({
    data: {
      reviewDate: new Date(data.reviewDate),
      topic: data.topic.trim(),
      decision: data.decision.trim(),
      ownerId: data.ownerId ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  })
  revalidatePath("/admin/strategic")
  return { success: true }
}

export async function setStrategicDecisionStatus(id: string, status: string) {
  await requireAdmin()
  await prisma.strategicReviewDecision.update({
    where: { id },
    data: { status },
  })
  revalidatePath("/admin/strategic")
  return { success: true }
}
