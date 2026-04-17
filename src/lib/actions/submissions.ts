"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireReviewer } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { SubmissionStatus } from "@prisma/client"
import { recalculateModuleProgress } from "@/lib/actions/modules"

const REVIEWER_ROLES = ["ADMIN", "TRAINER", "MULTIPLICATOR", "CHAMPION"] as const

export async function createSubmission(data: {
  moduleId: string
  title: string
  descriptionMd: string
  externalUrl?: string | null
}) {
  const session = await requireAuth()

  if (!data.title.trim()) {
    return { success: false, error: "Titel ist erforderlich." }
  }
  if (!data.descriptionMd.trim()) {
    return { success: false, error: "Beschreibung ist erforderlich." }
  }

  const mod = await prisma.module.findUnique({
    where: { id: data.moduleId },
    select: { id: true },
  })
  if (!mod) {
    return { success: false, error: "Modul nicht gefunden." }
  }

  const submission = await prisma.workProductSubmission.create({
    data: {
      userId: session.user.id,
      moduleId: data.moduleId,
      title: data.title.trim(),
      descriptionMd: data.descriptionMd.trim(),
      externalUrl: data.externalUrl?.trim() || null,
      status: SubmissionStatus.SUBMITTED,
    },
  })

  revalidatePath(`/modules/${data.moduleId}`)
  revalidatePath("/review")

  return { success: true, id: submission.id }
}

export async function updateSubmission(
  submissionId: string,
  data: {
    title: string
    descriptionMd: string
    externalUrl?: string | null
  }
) {
  const session = await requireAuth()

  const existing = await prisma.workProductSubmission.findUnique({
    where: { id: submissionId },
    select: { userId: true, status: true, moduleId: true },
  })
  if (!existing) return { success: false, error: "Einreichung nicht gefunden." }
  if (existing.userId !== session.user.id) {
    return { success: false, error: "Nicht berechtigt." }
  }
  if (
    existing.status !== SubmissionStatus.SUBMITTED &&
    existing.status !== SubmissionStatus.REWORK
  ) {
    return {
      success: false,
      error: "Einreichung kann in diesem Status nicht bearbeitet werden.",
    }
  }

  await prisma.workProductSubmission.update({
    where: { id: submissionId },
    data: {
      title: data.title.trim(),
      descriptionMd: data.descriptionMd.trim(),
      externalUrl: data.externalUrl?.trim() || null,
      status: SubmissionStatus.SUBMITTED,
    },
  })

  revalidatePath(`/modules/${existing.moduleId}`)
  revalidatePath("/review")

  return { success: true }
}

export async function getMySubmissionsForModule(moduleId: string) {
  const session = await requireAuth()

  const submissions = await prisma.workProductSubmission.findMany({
    where: { userId: session.user.id, moduleId },
    orderBy: { submittedAt: "desc" },
    include: {
      reviewer: { select: { id: true, name: true } },
    },
  })

  return submissions.map((s) => ({
    id: s.id,
    title: s.title,
    descriptionMd: s.descriptionMd,
    externalUrl: s.externalUrl,
    status: s.status,
    reviewerName: s.reviewer?.name ?? null,
    reviewNotes: s.reviewNotes,
    submittedAt: s.submittedAt.toISOString(),
    reviewedAt: s.reviewedAt?.toISOString() ?? null,
  }))
}

export interface ReviewQueueFilters {
  status?: SubmissionStatus | "ALL"
  moduleId?: string
}

export async function getReviewQueue(filters: ReviewQueueFilters = {}) {
  await requireReviewer()

  const where: Record<string, unknown> = {}
  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status
  } else {
    where.status = {
      in: [SubmissionStatus.SUBMITTED, SubmissionStatus.IN_REVIEW],
    }
  }
  if (filters.moduleId) {
    where.moduleId = filters.moduleId
  }

  const submissions = await prisma.workProductSubmission.findMany({
    where,
    orderBy: [{ status: "asc" }, { submittedAt: "asc" }],
    include: {
      user: { select: { id: true, name: true, email: true, businessRole: true } },
      module: {
        select: {
          id: true,
          title: true,
          code: true,
          track: { select: { name: true, competenceLevel: true } },
        },
      },
      reviewer: { select: { id: true, name: true } },
    },
  })

  return submissions.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    submittedAt: s.submittedAt.toISOString(),
    reviewedAt: s.reviewedAt?.toISOString() ?? null,
    user: s.user,
    module: {
      id: s.module.id,
      title: s.module.title,
      code: s.module.code,
      trackName: s.module.track.name,
      competenceLevel: s.module.track.competenceLevel,
    },
    reviewerName: s.reviewer?.name ?? null,
  }))
}

export async function getSubmissionDetail(submissionId: string) {
  const session = await requireAuth()

  const submission = await prisma.workProductSubmission.findUnique({
    where: { id: submissionId },
    include: {
      user: { select: { id: true, name: true, email: true, businessRole: true } },
      module: {
        select: {
          id: true,
          title: true,
          code: true,
          track: { select: { name: true, competenceLevel: true } },
        },
      },
      reviewer: { select: { id: true, name: true } },
    },
  })
  if (!submission) return null

  const isOwner = submission.userId === session.user.id
  const isReviewer = (REVIEWER_ROLES as readonly string[]).includes(
    session.user.role
  )
  if (!isOwner && !isReviewer) return null

  return {
    id: submission.id,
    title: submission.title,
    descriptionMd: submission.descriptionMd,
    externalUrl: submission.externalUrl,
    status: submission.status,
    reviewNotes: submission.reviewNotes,
    submittedAt: submission.submittedAt.toISOString(),
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    user: submission.user,
    module: {
      id: submission.module.id,
      title: submission.module.title,
      code: submission.module.code,
      trackName: submission.module.track.name,
      competenceLevel: submission.module.track.competenceLevel,
    },
    reviewer: submission.reviewer,
  }
}

export async function claimReview(submissionId: string) {
  const session = await requireReviewer()

  const existing = await prisma.workProductSubmission.findUnique({
    where: { id: submissionId },
    select: { status: true, reviewerId: true },
  })
  if (!existing) return { success: false, error: "Einreichung nicht gefunden." }
  if (
    existing.status !== SubmissionStatus.SUBMITTED &&
    existing.status !== SubmissionStatus.IN_REVIEW
  ) {
    return { success: false, error: "Einreichung bereits abgeschlossen." }
  }

  await prisma.workProductSubmission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.IN_REVIEW,
      reviewerId: session.user.id,
    },
  })

  revalidatePath("/review")
  return { success: true }
}

export async function approveSubmission(submissionId: string, notes?: string) {
  const session = await requireReviewer()

  const existing = await prisma.workProductSubmission.findUnique({
    where: { id: submissionId },
    select: { status: true, moduleId: true, userId: true },
  })
  if (!existing) return { success: false, error: "Einreichung nicht gefunden." }
  if (existing.status === SubmissionStatus.APPROVED) {
    return { success: false, error: "Bereits freigegeben." }
  }

  await prisma.workProductSubmission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.APPROVED,
      reviewerId: session.user.id,
      reviewNotes: notes?.trim() || null,
      reviewedAt: new Date(),
    },
  })

  // Neu berechnen, ob das Modul damit voll abgeschlossen ist
  await recalculateModuleProgress(existing.userId, existing.moduleId)

  revalidatePath("/review")
  revalidatePath(`/modules/${existing.moduleId}`)
  revalidatePath("/dashboard")
  return { success: true }
}

export async function requestRework(submissionId: string, notes: string) {
  const session = await requireReviewer()

  if (!notes.trim()) {
    return {
      success: false,
      error: "Bitte eine Nachricht fuer die Nacharbeit hinterlassen.",
    }
  }

  const existing = await prisma.workProductSubmission.findUnique({
    where: { id: submissionId },
    select: { status: true, moduleId: true },
  })
  if (!existing) return { success: false, error: "Einreichung nicht gefunden." }

  await prisma.workProductSubmission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.REWORK,
      reviewerId: session.user.id,
      reviewNotes: notes.trim(),
      reviewedAt: new Date(),
    },
  })

  revalidatePath("/review")
  revalidatePath(`/modules/${existing.moduleId}`)
  return { success: true }
}
