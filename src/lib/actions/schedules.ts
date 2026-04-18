"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export type ScheduleWithDetails = {
  id: string
  moduleId: string | null
  moduleTitle: string
  moduleCode: string
  location: string
  startTime: Date
  endTime: Date
  maxParticipants: number
  trainerId: string
  trainerName: string
  registrationCount: number
  isRegistered: boolean
}

export async function getSchedules(filters?: {
  moduleId?: string
  from?: Date
  to?: Date
}): Promise<ScheduleWithDetails[]> {
  try {
    const session = await auth()
    const userId = session?.user?.id || ""

    const where: any = {}
    if (filters?.moduleId) where.moduleId = filters.moduleId
    if (filters?.from || filters?.to) {
      where.startTime = {}
      if (filters?.from) where.startTime.gte = filters.from
      if (filters?.to) where.startTime.lte = filters.to
    }

    const schedules = await prisma.schedule.findMany({
      where,
      orderBy: { startTime: "asc" },
      include: {
        module: { select: { title: true, code: true } },
        trainer: { select: { name: true } },
        registrations: {
          select: { userId: true },
        },
      },
    })

    return schedules.map((s) => ({
      id: s.id,
      moduleId: s.moduleId,
      moduleTitle: s.module?.title ?? "",
      moduleCode: s.module?.code ?? "",
      location: s.location,
      startTime: s.startTime,
      endTime: s.endTime,
      maxParticipants: s.maxParticipants,
      trainerId: s.trainerId,
      trainerName: s.trainer.name,
      registrationCount: s.registrations.length,
      isRegistered: s.registrations.some((r) => r.userId === userId),
    }))
  } catch (error) {
    console.error("Error fetching schedules:", error)
    return []
  }
}

export async function getModuleSchedules(moduleId: string): Promise<ScheduleWithDetails[]> {
  return getSchedules({ moduleId })
}

export async function createSchedule(data: {
  moduleId: string
  location: string
  startTime: string
  endTime: string
  maxParticipants: number
  trainerId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Nicht angemeldet" }
    }
    if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
      return { success: false, error: "Keine Berechtigung" }
    }

    await prisma.schedule.create({
      data: {
        moduleId: data.moduleId,
        location: data.location,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        maxParticipants: data.maxParticipants,
        trainerId: data.trainerId,
      },
    })

    revalidatePath("/admin/calendar")
    return { success: true }
  } catch (error) {
    console.error("Error creating schedule:", error)
    return { success: false, error: "Fehler beim Erstellen des Termins" }
  }
}

export async function updateSchedule(
  scheduleId: string,
  data: {
    moduleId?: string
    location?: string
    startTime?: string
    endTime?: string
    maxParticipants?: number
    trainerId?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Nicht angemeldet" }
    }
    if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
      return { success: false, error: "Keine Berechtigung" }
    }

    const updateData: any = {}
    if (data.moduleId) updateData.moduleId = data.moduleId
    if (data.location) updateData.location = data.location
    if (data.startTime) updateData.startTime = new Date(data.startTime)
    if (data.endTime) updateData.endTime = new Date(data.endTime)
    if (data.maxParticipants !== undefined) updateData.maxParticipants = data.maxParticipants
    if (data.trainerId) updateData.trainerId = data.trainerId

    await prisma.schedule.update({
      where: { id: scheduleId },
      data: updateData,
    })

    revalidatePath("/admin/calendar")
    return { success: true }
  } catch (error) {
    console.error("Error updating schedule:", error)
    return { success: false, error: "Fehler beim Aktualisieren des Termins" }
  }
}

export async function deleteSchedule(
  scheduleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Nicht angemeldet" }
    }
    if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
      return { success: false, error: "Keine Berechtigung" }
    }

    await prisma.schedule.delete({ where: { id: scheduleId } })

    revalidatePath("/admin/calendar")
    return { success: true }
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return { success: false, error: "Fehler beim Loeschen des Termins" }
  }
}

export async function registerForSchedule(
  scheduleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Nicht angemeldet" }
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        registrations: { select: { userId: true } },
      },
    })

    if (!schedule) {
      return { success: false, error: "Termin nicht gefunden" }
    }

    if (schedule.registrations.length >= schedule.maxParticipants) {
      return { success: false, error: "Keine Plaetze mehr verfuegbar" }
    }

    if (schedule.registrations.some((r) => r.userId === session.user.id)) {
      return { success: false, error: "Bereits angemeldet" }
    }

    await prisma.scheduleRegistration.create({
      data: {
        scheduleId,
        userId: session.user.id,
      },
    })

    revalidatePath(`/modules/${schedule.moduleId}`)
    revalidatePath("/admin/calendar")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error registering for schedule:", error)
    return { success: false, error: "Fehler bei der Anmeldung" }
  }
}

export async function unregisterFromSchedule(
  scheduleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Nicht angemeldet" }
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      select: { moduleId: true },
    })

    if (!schedule) {
      return { success: false, error: "Termin nicht gefunden" }
    }

    await prisma.scheduleRegistration.delete({
      where: {
        scheduleId_userId: {
          scheduleId,
          userId: session.user.id,
        },
      },
    })

    revalidatePath(`/modules/${schedule.moduleId}`)
    revalidatePath("/admin/calendar")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error unregistering from schedule:", error)
    return { success: false, error: "Fehler bei der Abmeldung" }
  }
}

export async function getScheduleParticipants(scheduleId: string) {
  try {
    const registrations = await prisma.scheduleRegistration.findMany({
      where: { scheduleId },
      include: {
        schedule: {
          select: {
            module: { select: { title: true, code: true } },
            startTime: true,
            location: true,
          },
        },
      },
      orderBy: { registeredAt: "asc" },
    })

    // We need user info - fetch it from userId
    const userIds = registrations.map((r) => r.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, department: true },
    })

    const userMap = new Map(users.map((u) => [u.id, u]))

    return registrations.map((r) => ({
      id: r.id,
      registeredAt: r.registeredAt,
      user: userMap.get(r.userId) || { id: r.userId, name: "Unbekannt", email: "", department: null },
    }))
  } catch (error) {
    console.error("Error fetching participants:", error)
    return []
  }
}

export async function getUpcomingUserSchedules(userId: string, limit = 3) {
  try {
    const registrations = await prisma.scheduleRegistration.findMany({
      where: {
        userId,
        schedule: {
          startTime: { gte: new Date() },
        },
      },
      include: {
        schedule: {
          include: {
            module: { select: { id: true, title: true, code: true } },
            trainer: { select: { name: true } },
          },
        },
      },
      orderBy: { schedule: { startTime: "asc" } },
      take: limit,
    })

    return registrations.map((r) => ({
      id: r.schedule.id,
      moduleId: r.schedule.module?.id ?? null,
      moduleTitle: r.schedule.module?.title ?? "",
      moduleCode: r.schedule.module?.code ?? "",
      location: r.schedule.location,
      startTime: r.schedule.startTime,
      endTime: r.schedule.endTime,
      trainerName: r.schedule.trainer.name,
    }))
  } catch (error) {
    console.error("Error fetching upcoming schedules:", error)
    return []
  }
}

export async function getScheduleById(scheduleId: string) {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        module: { select: { title: true, code: true } },
        trainer: { select: { name: true } },
      },
    })

    if (!schedule) return null

    return {
      id: schedule.id,
      moduleId: schedule.moduleId,
      moduleTitle: schedule.module?.title ?? "",
      moduleCode: schedule.module?.code ?? "",
      location: schedule.location,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      maxParticipants: schedule.maxParticipants,
      trainerId: schedule.trainerId,
      trainerName: schedule.trainer.name,
    }
  } catch (error) {
    console.error("Error fetching schedule:", error)
    return null
  }
}

export async function getAllModulesForSelect() {
  try {
    return await prisma.module.findMany({
      orderBy: [{ track: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, title: true, code: true },
    })
  } catch {
    return []
  }
}

export async function getTrainersForSelect() {
  try {
    return await prisma.user.findMany({
      where: { role: { in: ["TRAINER", "ADMIN"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  } catch {
    return []
  }
}
