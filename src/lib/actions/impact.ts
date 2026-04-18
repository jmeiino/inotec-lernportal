"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireTrainer } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"

export async function createImpactStory(data: {
  title: string
  problem: string
  solution: string
  metric?: string | null
  tags?: string[]
}) {
  const session = await requireAuth()

  if (!data.title.trim() || !data.problem.trim() || !data.solution.trim()) {
    return { success: false, error: "Titel, Problem und Loesung sind Pflicht." }
  }

  const story = await prisma.impactStory.create({
    data: {
      authorId: session.user.id,
      title: data.title.trim(),
      problem: data.problem.trim(),
      solution: data.solution.trim(),
      metric: data.metric?.trim() || null,
      tags: Array.from(
        new Set(
          (data.tags ?? [])
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t.length > 0)
        )
      ).slice(0, 8),
      publishedAt: new Date(),
    },
  })

  revalidatePath("/impact")
  return { success: true, id: story.id }
}

export async function listImpactStories(limit = 50) {
  await requireAuth()
  const stories = await prisma.impactStory.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: limit,
  })
  const authors = await prisma.user.findMany({
    where: { id: { in: stories.map((s) => s.authorId) } },
    select: { id: true, name: true, department: true, businessRole: true },
  })
  const authorMap = new Map(authors.map((a) => [a.id, a]))

  return stories.map((s) => ({
    id: s.id,
    title: s.title,
    problem: s.problem,
    solution: s.solution,
    metric: s.metric,
    tags: s.tags,
    publishedAt: s.publishedAt?.toISOString() ?? null,
    author: authorMap.get(s.authorId) ?? null,
  }))
}

export async function getImpactOfTheMonth() {
  await requireAuth()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const story = await prisma.impactStory.findFirst({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
  })
  if (!story) return null
  const author = await prisma.user.findUnique({
    where: { id: story.authorId },
    select: { name: true, department: true },
  })
  return {
    id: story.id,
    title: story.title,
    metric: story.metric,
    authorName: author?.name ?? "unbekannt",
    department: author?.department ?? null,
    publishedAt: story.publishedAt?.toISOString() ?? null,
  }
}

export async function deleteImpactStory(id: string) {
  await requireTrainer()
  await prisma.impactStory.delete({ where: { id } })
  revalidatePath("/impact")
  return { success: true }
}
