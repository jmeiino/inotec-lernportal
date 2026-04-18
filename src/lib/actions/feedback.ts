"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireTrainer } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"

export async function submitModuleFeedback(data: {
  moduleId: string
  relevance: number
  quality: number
  openText?: string | null
}) {
  const session = await requireAuth()

  if (data.relevance < 1 || data.relevance > 5) {
    return { success: false, error: "Relevance muss zwischen 1 und 5 liegen." }
  }
  if (data.quality < 1 || data.quality > 5) {
    return { success: false, error: "Quality muss zwischen 1 und 5 liegen." }
  }

  await prisma.moduleFeedback.upsert({
    where: {
      userId_moduleId: { userId: session.user.id, moduleId: data.moduleId },
    },
    update: {
      relevance: data.relevance,
      quality: data.quality,
      openText: data.openText?.trim() || null,
      submittedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      moduleId: data.moduleId,
      relevance: data.relevance,
      quality: data.quality,
      openText: data.openText?.trim() || null,
    },
  })

  revalidatePath(`/modules/${data.moduleId}`)
  return { success: true }
}

export async function getMyModuleFeedback(moduleId: string) {
  const session = await requireAuth()
  return prisma.moduleFeedback.findUnique({
    where: { userId_moduleId: { userId: session.user.id, moduleId } },
    select: {
      relevance: true,
      quality: true,
      openText: true,
      submittedAt: true,
    },
  })
}

export async function getModuleFeedbackStats(moduleId: string) {
  await requireTrainer()

  const rows = await prisma.moduleFeedback.findMany({
    where: { moduleId },
    select: {
      relevance: true,
      quality: true,
      openText: true,
      submittedAt: true,
    },
    orderBy: { submittedAt: "desc" },
  })

  const n = rows.length
  const avgRelevance =
    n > 0 ? rows.reduce((s, r) => s + r.relevance, 0) / n : null
  const avgQuality =
    n > 0 ? rows.reduce((s, r) => s + r.quality, 0) / n : null

  return {
    n,
    avgRelevance,
    avgQuality,
    openTexts: rows
      .filter((r) => r.openText && r.openText.length > 0)
      .map((r) => ({
        text: r.openText as string,
        submittedAt: r.submittedAt.toISOString(),
      })),
  }
}

export async function getFeedbackLowPerformers(limit = 5) {
  await requireTrainer()

  const rows = await prisma.moduleFeedback.groupBy({
    by: ["moduleId"],
    _avg: { relevance: true, quality: true },
    _count: { _all: true },
  })

  const withModules = await Promise.all(
    rows
      .filter((r) => (r._count._all ?? 0) >= 3)
      .map(async (r) => {
        const mod = await prisma.module.findUnique({
          where: { id: r.moduleId },
          select: { code: true, title: true },
        })
        const avgR = r._avg.relevance ?? 0
        const avgQ = r._avg.quality ?? 0
        return {
          moduleId: r.moduleId,
          code: mod?.code ?? "",
          title: mod?.title ?? "",
          avgRelevance: avgR,
          avgQuality: avgQ,
          score: (avgR + avgQ) / 2,
          n: r._count._all,
        }
      })
  )

  return withModules.sort((a, b) => a.score - b.score).slice(0, limit)
}
