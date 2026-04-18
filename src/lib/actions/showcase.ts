"use server"

import { prisma } from "@/lib/prisma"
import {
  requireAuth,
  requireReviewer,
} from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { BusinessRole, CompetenceLevel, SubmissionStatus } from "@prisma/client"

export async function publishSubmission(id: string, publish: boolean) {
  const session = await requireAuth()

  const existing = await prisma.workProductSubmission.findUnique({
    where: { id },
    select: { userId: true, status: true },
  })
  if (!existing) return { success: false, error: "Nicht gefunden." }

  const isOwner = existing.userId === session.user.id
  const isReviewer = ["ADMIN", "TRAINER", "MULTIPLICATOR", "CHAMPION"].includes(
    session.user.role
  )
  if (!isOwner && !isReviewer) {
    return { success: false, error: "Nicht berechtigt." }
  }

  if (existing.status !== SubmissionStatus.APPROVED) {
    return {
      success: false,
      error: "Nur freigegebene Einreichungen koennen veroeffentlicht werden.",
    }
  }

  await prisma.workProductSubmission.update({
    where: { id },
    data: { published: publish },
  })

  revalidatePath("/showcase")
  revalidatePath("/review")
  return { success: true }
}

export async function setSubmissionTags(id: string, tags: string[]) {
  await requireReviewer()

  const cleaned = Array.from(
    new Set(
      tags
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 30)
    )
  ).slice(0, 10)

  await prisma.workProductSubmission.update({
    where: { id },
    data: { tags: cleaned },
  })

  revalidatePath("/showcase")
  revalidatePath("/review")
  return { success: true, tags: cleaned }
}

export async function likeShowcase(id: string) {
  await requireAuth()

  const updated = await prisma.workProductSubmission.update({
    where: { id },
    data: { likes: { increment: 1 } },
    select: { likes: true, published: true },
  })

  if (!updated.published) {
    return { success: false, error: "Nicht veroeffentlicht." }
  }

  revalidatePath("/showcase")
  return { success: true, likes: updated.likes }
}

export interface ShowcaseFilters {
  businessRole?: BusinessRole | "ALL"
  competenceLevel?: CompetenceLevel | "ALL"
  tag?: string
}

export async function listShowcase(filters: ShowcaseFilters = {}) {
  await requireAuth()

  const where: Record<string, unknown> = {
    published: true,
    status: SubmissionStatus.APPROVED,
  }
  if (filters.tag) {
    where.tags = { has: filters.tag.toLowerCase() }
  }

  const submissions = await prisma.workProductSubmission.findMany({
    where,
    orderBy: [{ likes: "desc" }, { reviewedAt: "desc" }],
    include: {
      user: {
        select: { name: true, businessRole: true, department: true },
      },
      module: {
        select: {
          title: true,
          code: true,
          track: {
            select: { name: true, competenceLevel: true, businessRole: true },
          },
        },
      },
    },
  })

  const filtered = submissions.filter((s) => {
    if (filters.businessRole && filters.businessRole !== "ALL") {
      const br = s.module.track.businessRole ?? s.user.businessRole
      if (br !== filters.businessRole) return false
    }
    if (filters.competenceLevel && filters.competenceLevel !== "ALL") {
      if (s.module.track.competenceLevel !== filters.competenceLevel) return false
    }
    return true
  })

  const allTags = new Set<string>()
  for (const s of submissions) for (const t of s.tags) allTags.add(t)

  return {
    items: filtered.map((s) => ({
      id: s.id,
      title: s.title,
      descriptionMd: s.descriptionMd,
      externalUrl: s.externalUrl,
      likes: s.likes,
      tags: s.tags,
      reviewedAt: s.reviewedAt?.toISOString() ?? null,
      author: {
        name: s.user.name,
        department: s.user.department,
        businessRole: s.user.businessRole,
      },
      module: {
        title: s.module.title,
        code: s.module.code,
        trackName: s.module.track.name,
        competenceLevel: s.module.track.competenceLevel,
      },
    })),
    availableTags: Array.from(allTags).sort(),
  }
}
