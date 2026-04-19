"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { CompetenceLevel, TrackCategory } from "@prisma/client"

export type RecommendedTrack = {
  id: string
  name: string
  description: string | null
  competenceLevel: CompetenceLevel
  category: TrackCategory
  reason: string
  priority: number
}

const FACH_ORDER: CompetenceLevel[] = ["L1", "L2", "L3", "L4"]
const FUEHRUNG_ORDER: CompetenceLevel[] = ["F1", "F2", "F3"]

export async function getRecommendedTracks(): Promise<RecommendedTrack[]> {
  const session = await requireAuth()

  const [user, tracks, enrollments, completedProgress] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { businessRole: true },
    }),
    prisma.track.findMany({
      orderBy: { sortOrder: "asc" },
      include: { modules: { select: { id: true } } },
    }),
    prisma.enrollment.findMany({
      where: { userId: session.user.id },
      select: { trackId: true, status: true },
    }),
    prisma.moduleProgress.findMany({
      where: { userId: session.user.id, status: "COMPLETED" },
      select: {
        module: { select: { trackId: true, track: { select: { competenceLevel: true } } } },
      },
    }),
  ])

  const enrolledMap = new Map(enrollments.map((e) => [e.trackId, e.status]))

  const completedLevels = new Set<CompetenceLevel>()
  const completedTrackCount = new Map<string, number>()
  for (const p of completedProgress) {
    completedLevels.add(p.module.track.competenceLevel)
    completedTrackCount.set(
      p.module.trackId,
      (completedTrackCount.get(p.module.trackId) ?? 0) + 1
    )
  }

  const userRole = user?.businessRole

  const recommendations: RecommendedTrack[] = []

  for (const t of tracks) {
    const status = enrolledMap.get(t.id)
    if (status === "COMPLETED") continue
    const allDone =
      completedTrackCount.get(t.id) === t.modules.length && t.modules.length > 0
    if (allDone) continue

    let priority = 100
    let reason = ""

    // Pflichtstufen zuerst
    if (t.competenceLevel === "L1" && !completedLevels.has("L1")) {
      priority = 10
      reason = "Pflicht-Basisstufe — fuer alle Mitarbeitenden vorgesehen"
    } else if (t.competenceLevel === "F1" && !completedLevels.has("F1")) {
      priority = 15
      reason = "Pflicht fuer Fuehrungskraefte"
    }

    // Rollen-Match
    if (userRole && t.businessRole === userRole) {
      priority -= 30
      reason = reason || `Passt zu Ihrer Rolle ${userRole}`
    }

    // Aufbauend auf vorhandener Stufe
    if (t.category === TrackCategory.FACH) {
      const idx = FACH_ORDER.indexOf(t.competenceLevel)
      const prev = idx > 0 ? FACH_ORDER[idx - 1] : null
      if (prev && completedLevels.has(prev) && !completedLevels.has(t.competenceLevel)) {
        priority -= 20
        reason = reason || `Naechste Stufe nach ${prev}`
      }
    }
    if (t.category === TrackCategory.FUEHRUNG) {
      const idx = FUEHRUNG_ORDER.indexOf(t.competenceLevel)
      const prev = idx > 0 ? FUEHRUNG_ORDER[idx - 1] : null
      if (prev && completedLevels.has(prev) && !completedLevels.has(t.competenceLevel)) {
        priority -= 18
        reason = reason || `Naechste Fuehrungsstufe nach ${prev}`
      }
    }

    // Fuehrungs-Tracks nicht aktiv empfehlen, wenn keine FK-Indikation
    if (t.category === TrackCategory.FUEHRUNG && userRole !== "FUEHRUNG") {
      if (priority < 50) priority = 90
    }

    if (status === "ACTIVE") {
      priority -= 5
      reason = reason || "Bereits aktiv — weiter empfohlen"
    }

    if (priority >= 100 && !reason) continue

    recommendations.push({
      id: t.id,
      name: t.name,
      description: t.description,
      competenceLevel: t.competenceLevel,
      category: t.category,
      reason: reason || "Allgemein empfohlen",
      priority,
    })
  }

  return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 6)
}
