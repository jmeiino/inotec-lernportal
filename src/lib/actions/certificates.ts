"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { CompetenceLevel } from "@prisma/client"

export type CertificateData = {
  id: string
  certNumber: string
  issuedAt: Date
  trackName: string
  competenceLevel: CompetenceLevel
  userName: string
}

export async function getUserCertificates(): Promise<{
  data?: CertificateData[]
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { error: "Nicht authentifiziert." }
    }

    const certificates = await prisma.certificate.findMany({
      where: { userId: session.user.id },
      include: {
        track: { select: { name: true, competenceLevel: true } },
        user: { select: { name: true } },
      },
      orderBy: { issuedAt: "desc" },
    })

    return {
      data: certificates.map((c) => ({
        id: c.id,
        certNumber: c.certNumber,
        issuedAt: c.issuedAt,
        trackName: c.track.name,
        competenceLevel: c.track.competenceLevel,
        userName: c.user.name,
      })),
    }
  } catch (error) {
    console.error("Error loading certificates:", error)
    return { error: "Fehler beim Laden der Zertifikate." }
  }
}

export async function checkAndCreateCertificate(
  trackId: string
): Promise<{
  data?: { certificateId: string; certNumber: string }
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { error: "Nicht authentifiziert." }
    }

    const userId = session.user.id

    // Check if certificate already exists
    const existingCert = await prisma.certificate.findFirst({
      where: { userId, trackId },
    })

    if (existingCert) {
      return {
        data: {
          certificateId: existingCert.id,
          certNumber: existingCert.certNumber,
        },
      }
    }

    // Get all modules in track
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { modules: { select: { id: true } } },
    })

    if (!track) {
      return { error: "Lernpfad nicht gefunden." }
    }

    const allModuleIds = track.modules.map((m) => m.id)

    // Check if all modules are completed
    const completedCount = await prisma.moduleProgress.count({
      where: {
        userId,
        moduleId: { in: allModuleIds },
        status: "COMPLETED",
      },
    })

    if (completedCount < allModuleIds.length) {
      return {
        error: `Noch nicht alle Module abgeschlossen (${completedCount}/${allModuleIds.length}).`,
      }
    }

    // Generate certificate number
    const trackLetter = track.name.charAt(0).toUpperCase()
    const year = new Date().getFullYear()

    const certCount = await prisma.certificate.count({
      where: {
        certNumber: {
          startsWith: `CERT-${trackLetter}-${year}-`,
        },
      },
    })

    const certNumber = `CERT-${trackLetter}-${year}-${String(
      certCount + 1
    ).padStart(4, "0")}`

    const certificate = await prisma.certificate.create({
      data: {
        userId,
        trackId,
        certNumber,
      },
    })

    // Update enrollment
    await prisma.enrollment.updateMany({
      where: {
        userId,
        trackId,
        status: { not: "COMPLETED" },
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    })

    return {
      data: {
        certificateId: certificate.id,
        certNumber: certificate.certNumber,
      },
    }
  } catch (error) {
    console.error("Error creating certificate:", error)
    return { error: "Fehler beim Erstellen des Zertifikats." }
  }
}
