"use server"

import { prisma } from "@/lib/prisma"
import { CompetenceLevel, TrackCategory } from "@prisma/client"

const FACH_LEVELS: CompetenceLevel[] = [
  CompetenceLevel.L1,
  CompetenceLevel.L2,
  CompetenceLevel.L3,
  CompetenceLevel.L4,
]
const FUEHRUNG_LEVELS: CompetenceLevel[] = [
  CompetenceLevel.F1,
  CompetenceLevel.F2,
  CompetenceLevel.F3,
]

export type PyramidLevelData = {
  level: CompetenceLevel
  totalTracks: number
  enrolledTracks: number
  totalModules: number
  completedModules: number
  progressPct: number
  tracks: Array<{
    id: string
    name: string
    enrolled: boolean
    totalModules: number
    completedModules: number
    progressPct: number
  }>
}

export type PyramidData = {
  category: TrackCategory
  levels: PyramidLevelData[]
}

export async function getDashboardData(userId: string) {
  try {
    const [enrollments, certificates, scheduleRegistrations, allTracks] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          track: {
            include: {
              modules: {
                orderBy: { sortOrder: "asc" },
                include: {
                  progress: {
                    where: { userId },
                    take: 1,
                  },
                  lessons: {
                    orderBy: { sortOrder: "asc" },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.certificate.findMany({
        where: { userId },
        include: { track: true },
        orderBy: { issuedAt: "desc" },
        take: 3,
      }),
      prisma.scheduleRegistration.findMany({
        where: {
          userId,
          schedule: {
            startTime: { gte: new Date() },
          },
        },
        include: {
          schedule: {
            include: {
              module: {
                select: { title: true, code: true },
              },
            },
          },
        },
        orderBy: { schedule: { startTime: "asc" } },
        take: 3,
      }),
      prisma.track.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          modules: {
            orderBy: { sortOrder: "asc" },
            include: {
              progress: {
                where: { userId },
                take: 1,
              },
            },
          },
          enrollments: {
            where: { userId },
            take: 1,
          },
        },
      }),
    ])

    // Find the next incomplete module across all enrollments
    let continueModule: {
      moduleId: string
      moduleTitle: string
      moduleCode: string
      trackName: string
      progressPct: number
    } | null = null

    for (const enrollment of enrollments) {
      if (enrollment.status === "COMPLETED") continue
      for (const mod of enrollment.track.modules) {
        const progress = mod.progress[0]
        if (!progress || progress.status !== "COMPLETED") {
          continueModule = {
            moduleId: mod.id,
            moduleTitle: mod.title,
            moduleCode: mod.code,
            trackName: enrollment.track.name,
            progressPct: progress?.progressPct ?? 0,
          }
          break
        }
      }
      if (continueModule) break
    }

    // Calculate track progress
    const trackProgress = enrollments.map((enrollment) => {
      const modules = enrollment.track.modules
      const totalModules = modules.length
      const completedModules = modules.filter(
        (m) => m.progress[0]?.status === "COMPLETED"
      ).length
      const overallPct =
        totalModules > 0
          ? Math.round(
              modules.reduce(
                (sum, m) => sum + (m.progress[0]?.progressPct ?? 0),
                0
              ) / totalModules
            )
          : 0

      return {
        enrollmentId: enrollment.id,
        trackId: enrollment.track.id,
        trackName: enrollment.track.name,
        competenceLevel: enrollment.track.competenceLevel,
        category: enrollment.track.category,
        status: enrollment.status,
        totalModules,
        completedModules,
        overallPct,
        modules: modules.map((m) => ({
          id: m.id,
          title: m.title,
          code: m.code,
          status: m.progress[0]?.status ?? "NOT_STARTED",
          progressPct: m.progress[0]?.progressPct ?? 0,
        })),
      }
    })

    const upcomingSchedules = scheduleRegistrations.map((reg) => ({
      id: reg.schedule.id,
      moduleTitle: reg.schedule.module?.title ?? "",
      moduleCode: reg.schedule.module?.code ?? "",
      location: reg.schedule.location,
      startTime: reg.schedule.startTime,
      endTime: reg.schedule.endTime,
    }))

    const recentCertificates = certificates.map((cert) => ({
      id: cert.id,
      certNumber: cert.certNumber,
      trackName: cert.track.name,
      competenceLevel: cert.track.competenceLevel,
      issuedAt: cert.issuedAt,
    }))

    const buildPyramid = (
      category: TrackCategory,
      levels: CompetenceLevel[]
    ): PyramidData => {
      const levelsData: PyramidLevelData[] = levels.map((level) => {
        const tracksForLevel = allTracks.filter(
          (t) => t.category === category && t.competenceLevel === level
        )

        const trackSummaries = tracksForLevel.map((t) => {
          const enrolled = t.enrollments.length > 0
          const totalModules = t.modules.length
          const completedModules = t.modules.filter(
            (m) => m.progress[0]?.status === "COMPLETED"
          ).length
          const progressPct =
            totalModules > 0
              ? Math.round(
                  t.modules.reduce(
                    (sum, m) => sum + (m.progress[0]?.progressPct ?? 0),
                    0
                  ) / totalModules
                )
              : 0
          return {
            id: t.id,
            name: t.name,
            enrolled,
            totalModules,
            completedModules,
            progressPct,
          }
        })

        const totalModules = trackSummaries.reduce((s, t) => s + t.totalModules, 0)
        const completedModules = trackSummaries.reduce(
          (s, t) => s + t.completedModules,
          0
        )
        const progressPct =
          totalModules > 0
            ? Math.round((completedModules / totalModules) * 100)
            : 0

        return {
          level,
          totalTracks: trackSummaries.length,
          enrolledTracks: trackSummaries.filter((t) => t.enrolled).length,
          totalModules,
          completedModules,
          progressPct,
          tracks: trackSummaries,
        }
      })

      return { category, levels: levelsData }
    }

    const fachPyramid: PyramidData = buildPyramid(TrackCategory.FACH, FACH_LEVELS)
    const fuehrungPyramid: PyramidData = buildPyramid(
      TrackCategory.FUEHRUNG,
      FUEHRUNG_LEVELS
    )

    return {
      continueModule,
      trackProgress,
      upcomingSchedules,
      recentCertificates,
      fachPyramid,
      fuehrungPyramid,
      stats: {
        activeCourses: enrollments.filter((e) => e.status === "ACTIVE").length,
        completedCourses: enrollments.filter((e) => e.status === "COMPLETED").length,
        certificateCount: certificates.length,
      },
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return {
      continueModule: null,
      trackProgress: [],
      upcomingSchedules: [],
      recentCertificates: [],
      fachPyramid: { category: TrackCategory.FACH, levels: [] as PyramidLevelData[] },
      fuehrungPyramid: { category: TrackCategory.FUEHRUNG, levels: [] as PyramidLevelData[] },
      stats: { activeCourses: 0, completedCourses: 0, certificateCount: 0 },
    }
  }
}
