"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireAdmin } from "@/lib/auth-guard"
import {
  CompetenceLevel,
  SubmissionStatus,
} from "@prisma/client"
import { revalidatePath } from "next/cache"

export type TeamMemberRow = {
  id: string
  name: string
  email: string
  department: string | null
  businessRole: string | null
  role: string
  totalModules: number
  completedModules: number
  progressPct: number
  hasL1Done: boolean
  hasF1Done: boolean
  openSubmissions: number
  lastActivity: string | null
}

function moduleHighestLevelDone(
  completedLevels: CompetenceLevel[],
  target: CompetenceLevel
): boolean {
  return completedLevels.includes(target)
}

export async function setUserManager(userId: string, managerId: string | null) {
  await requireAdmin()
  if (managerId && managerId === userId) {
    return { success: false, error: "User kann nicht sein eigener Manager sein." }
  }
  await prisma.user.update({
    where: { id: userId },
    data: { managerId },
  })
  revalidatePath("/admin/users")
  revalidatePath("/my-team")
  return { success: true }
}

export async function listPossibleManagers() {
  await requireAdmin()
  return prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })
}

export async function getMyTeamOverview(): Promise<TeamMemberRow[]> {
  const session = await requireAuth()

  const reports = await prisma.user.findMany({
    where: { managerId: session.user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      businessRole: true,
      role: true,
      progress: {
        select: {
          status: true,
          progressPct: true,
          module: {
            select: {
              track: { select: { competenceLevel: true } },
            },
          },
        },
      },
      submissions: {
        where: {
          status: {
            in: [SubmissionStatus.SUBMITTED, SubmissionStatus.IN_REVIEW, SubmissionStatus.REWORK],
          },
        },
        select: { id: true },
      },
      attempts: {
        orderBy: { takenAt: "desc" },
        take: 1,
        select: { takenAt: true },
      },
    },
  })

  return reports.map((r) => {
    const total = r.progress.length
    const done = r.progress.filter((p) => p.status === "COMPLETED")
    const avg =
      total > 0
        ? Math.round(r.progress.reduce((s, p) => s + p.progressPct, 0) / total)
        : 0
    const completedLevels = done.map((p) => p.module.track.competenceLevel)

    return {
      id: r.id,
      name: r.name,
      email: r.email,
      department: r.department,
      businessRole: r.businessRole,
      role: r.role,
      totalModules: total,
      completedModules: done.length,
      progressPct: avg,
      hasL1Done: moduleHighestLevelDone(completedLevels, CompetenceLevel.L1),
      hasF1Done: moduleHighestLevelDone(completedLevels, CompetenceLevel.F1),
      openSubmissions: r.submissions.length,
      lastActivity: r.attempts[0]?.takenAt?.toISOString() ?? null,
    }
  })
}

export async function getTeamSize() {
  const session = await requireAuth()
  return prisma.user.count({ where: { managerId: session.user.id } })
}
