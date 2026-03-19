"use server"

import { prisma } from "@/lib/prisma"

export async function getDashboardData(userId: string) {
  try {
    const [enrollments, certificates, scheduleRegistrations] = await Promise.all([
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
        trackLevel: enrollment.track.level,
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
      moduleTitle: reg.schedule.module.title,
      moduleCode: reg.schedule.module.code,
      location: reg.schedule.location,
      startTime: reg.schedule.startTime,
      endTime: reg.schedule.endTime,
    }))

    const recentCertificates = certificates.map((cert) => ({
      id: cert.id,
      certNumber: cert.certNumber,
      trackName: cert.track.name,
      trackLevel: cert.track.level,
      issuedAt: cert.issuedAt,
    }))

    return {
      continueModule,
      trackProgress,
      upcomingSchedules,
      recentCertificates,
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
      stats: { activeCourses: 0, completedCourses: 0, certificateCount: 0 },
    }
  }
}
