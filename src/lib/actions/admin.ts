"use server"

import { prisma } from "@/lib/prisma"
import { requireTrainer, requireAdmin } from "@/lib/auth-guard"
import type { Role, BusinessRole } from "@prisma/client"

export async function getAdminDashboard() {
  await requireTrainer()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalEnrollments,
    completedEnrollments,
    activeLearners,
    quizAttempts,
    trackCompletionRates,
    recentAttempts,
    topPerformers,
    lowestScoreModules,
  ] = await Promise.all([
    // Total enrollments
    prisma.enrollment.count(),

    // Completed enrollments
    prisma.enrollment.count({ where: { status: "COMPLETED" } }),

    // Active learners (users with quiz attempts or module progress in last 30 days)
    prisma.user.count({
      where: {
        OR: [
          { attempts: { some: { takenAt: { gte: thirtyDaysAgo } } } },
          { progress: { some: { completedAt: { gte: thirtyDaysAgo } } } },
        ],
      },
    }),

    // All quiz attempts for average score
    prisma.quizAttempt.aggregate({
      _avg: { score: true },
      _count: true,
    }),

    // Track completion rates
    prisma.track.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { enrollments: true },
        },
        enrollments: {
          where: { status: "COMPLETED" },
          select: { id: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),

    // Recent quiz attempts
    prisma.quizAttempt.findMany({
      take: 10,
      orderBy: { takenAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        quiz: {
          include: {
            module: { select: { title: true, code: true } },
          },
        },
      },
    }),

    // Top performers: users with most completed modules
    prisma.user.findMany({
      where: {
        progress: { some: { status: "COMPLETED" } },
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        _count: {
          select: {
            progress: { where: { status: "COMPLETED" } },
          },
        },
      },
      orderBy: {
        progress: { _count: "desc" },
      },
      take: 10,
    }),

    // Modules with lowest quiz scores
    prisma.module.findMany({
      where: {
        quizzes: {
          some: {
            attempts: { some: {} },
          },
        },
      },
      select: {
        id: true,
        title: true,
        code: true,
        quizzes: {
          select: {
            attempts: {
              select: { score: true },
            },
          },
        },
      },
    }),
  ])

  // Calculate track completion rates
  const trackRates = trackCompletionRates.map((track) => ({
    id: track.id,
    name: track.name,
    totalEnrollments: track._count.enrollments,
    completedEnrollments: track.enrollments.length,
    rate:
      track._count.enrollments > 0
        ? Math.round((track.enrollments.length / track._count.enrollments) * 100)
        : 0,
  }))

  // Calculate module avg scores
  const moduleScores = lowestScoreModules
    .map((mod) => {
      const allScores = mod.quizzes.flatMap((q) => q.attempts.map((a) => a.score))
      const avgScore =
        allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : 0
      return {
        id: mod.id,
        title: mod.title,
        code: mod.code,
        avgScore,
        attemptCount: allScores.length,
      }
    })
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5)

  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0

  return {
    kpis: {
      totalEnrollments,
      activeLearners,
      completionRate,
      avgQuizScore: Math.round(quizAttempts._avg.score ?? 0),
    },
    trackRates,
    recentAttempts: recentAttempts.map((a) => ({
      id: a.id,
      userName: a.user.name,
      userEmail: a.user.email,
      moduleTitle: a.quiz.module.title,
      moduleCode: a.quiz.module.code,
      score: a.score,
      passed: a.passed,
      takenAt: a.takenAt.toISOString(),
    })),
    topPerformers: topPerformers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      department: u.department,
      completedModules: u._count.progress,
    })),
    moduleScores,
  }
}

export interface UserFilters {
  search?: string
  department?: string
  trackId?: string
  role?: string
}

export async function getAdminUsers(filters: UserFilters = {}) {
  await requireTrainer()

  const where: Record<string, unknown> = {}

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ]
  }
  if (filters.department) {
    where.department = filters.department
  }
  if (filters.role) {
    where.role = filters.role as Role
  }
  if (filters.trackId) {
    where.enrollments = { some: { trackId: filters.trackId } }
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      businessRole: true,
      role: true,
      createdAt: true,
      enrollments: {
        select: {
          id: true,
          trackId: true,
          status: true,
          track: { select: { name: true } },
        },
      },
      progress: {
        select: {
          status: true,
          progressPct: true,
        },
      },
      attempts: {
        orderBy: { takenAt: "desc" },
        take: 1,
        select: { takenAt: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return users.map((u) => {
    const totalModules = u.progress.length
    const completedModules = u.progress.filter((p) => p.status === "COMPLETED").length
    const avgProgress =
      totalModules > 0
        ? Math.round(u.progress.reduce((a, b) => a + b.progressPct, 0) / totalModules)
        : 0
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      department: u.department,
      businessRole: u.businessRole,
      role: u.role,
      enrollmentCount: u.enrollments.length,
      progress: avgProgress,
      completedModules,
      totalModules,
      lastActivity: u.attempts[0]?.takenAt?.toISOString() ?? null,
    }
  })
}

export async function getFilterOptions() {
  await requireTrainer()

  const [departments, tracks] = await Promise.all([
    prisma.user.findMany({
      where: { department: { not: null } },
      select: { department: true },
      distinct: ["department"],
    }),
    prisma.track.findMany({
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ])

  return {
    departments: departments
      .map((d) => d.department)
      .filter((d): d is string => d !== null),
    tracks,
  }
}

export async function getUserDetail(userId: string) {
  await requireTrainer()

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      enrollments: {
        include: {
          track: {
            include: {
              modules: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  title: true,
                  code: true,
                },
              },
            },
          },
        },
      },
      progress: {
        include: {
          module: { select: { title: true, code: true } },
        },
      },
      attempts: {
        orderBy: { takenAt: "desc" },
        take: 20,
        include: {
          quiz: {
            include: {
              module: { select: { title: true, code: true } },
            },
          },
        },
      },
    },
  })

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
    businessRole: user.businessRole,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    enrollments: user.enrollments.map((e) => ({
      id: e.id,
      trackId: e.trackId,
      trackName: e.track.name,
      status: e.status,
      moduleCount: e.track.modules.length,
    })),
    progress: user.progress.map((p) => ({
      moduleId: p.moduleId,
      moduleTitle: p.module.title,
      moduleCode: p.module.code,
      status: p.status,
      progressPct: p.progressPct,
      completedAt: p.completedAt?.toISOString() ?? null,
    })),
    attempts: user.attempts.map((a) => ({
      id: a.id,
      moduleTitle: a.quiz.module.title,
      moduleCode: a.quiz.module.code,
      score: a.score,
      passed: a.passed,
      takenAt: a.takenAt.toISOString(),
    })),
  }
}

export async function updateUserRole(userId: string, role: Role) {
  await requireAdmin()

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  })

  return { success: true }
}

export async function updateUserBusinessRole(
  userId: string,
  businessRole: BusinessRole | null
) {
  await requireAdmin()

  await prisma.user.update({
    where: { id: userId },
    data: { businessRole },
  })

  return { success: true }
}

export async function enrollUserInTrack(userId: string, trackId: string) {
  await requireAdmin()

  await prisma.enrollment.create({
    data: { userId, trackId, status: "ACTIVE" },
  })

  return { success: true }
}

export async function removeUserFromTrack(userId: string, trackId: string) {
  await requireAdmin()

  await prisma.enrollment.deleteMany({
    where: { userId, trackId },
  })

  return { success: true }
}

export async function exportUsersCSV(filters: UserFilters = {}) {
  await requireTrainer()

  const users = await getAdminUsers(filters)

  const header = "Name,Email,Abteilung,BusinessRole,Rolle,Einschreibungen,Fortschritt %,Abgeschlossene Module,Letzte Aktivität"
  const rows = users.map((u) =>
    [
      `"${u.name}"`,
      `"${u.email}"`,
      `"${u.department || ""}"`,
      u.businessRole || "",
      u.role,
      u.enrollmentCount,
      u.progress,
      u.completedModules,
      u.lastActivity ? new Date(u.lastActivity).toLocaleDateString("de-DE") : "",
    ].join(",")
  )

  return [header, ...rows].join("\n")
}
