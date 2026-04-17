"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getCatalogData(userId: string) {
  try {
    const [tracks, enrollments, moduleProgress] = await Promise.all([
      prisma.track.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          modules: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              code: true,
              title: true,
              description: true,
              durationHours: true,
              format: true,
              sortOrder: true,
            },
          },
        },
      }),
      prisma.enrollment.findMany({
        where: { userId },
        select: {
          trackId: true,
          status: true,
        },
      }),
      prisma.moduleProgress.findMany({
        where: { userId },
        select: {
          moduleId: true,
          status: true,
          progressPct: true,
        },
      }),
    ])

    const enrollmentMap = new Map(
      enrollments.map((e) => [e.trackId, e.status])
    )
    const progressMap = new Map(
      moduleProgress.map((p) => [p.moduleId, { status: p.status, progressPct: p.progressPct }])
    )

    const tracksWithStatus = tracks.map((track) => {
      const enrollmentStatus = enrollmentMap.get(track.id) || null
      const modules = track.modules.map((mod) => {
        const progress = progressMap.get(mod.id)
        return {
          ...mod,
          moduleStatus: progress?.status ?? null,
          progressPct: progress?.progressPct ?? 0,
        }
      })

      const totalModules = modules.length
      const completedModules = modules.filter(
        (m) => m.moduleStatus === "COMPLETED"
      ).length
      const overallPct =
        totalModules > 0
          ? Math.round(
              modules.reduce((sum, m) => sum + m.progressPct, 0) / totalModules
            )
          : 0

      return {
        id: track.id,
        name: track.name,
        description: track.description,
        competenceLevel: track.competenceLevel,
        category: track.category,
        businessRole: track.businessRole,
        enrollmentStatus,
        totalModules,
        completedModules,
        overallPct,
        modules,
      }
    })

    return { tracks: tracksWithStatus }
  } catch (error) {
    console.error("Error fetching catalog data:", error)
    return { tracks: [] }
  }
}

export async function enrollInTrack(userId: string, trackId: string) {
  try {
    const existing = await prisma.enrollment.findUnique({
      where: { userId_trackId: { userId, trackId } },
    })

    if (existing) {
      return { success: false, error: "Bereits eingeschrieben" }
    }

    await prisma.enrollment.create({
      data: { userId, trackId, status: "ACTIVE" },
    })

    revalidatePath("/catalog")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("Error enrolling in track:", error)
    return { success: false, error: "Einschreibung fehlgeschlagen" }
  }
}
