"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireTrainer } from "@/lib/auth-guard"
import { EventType } from "@prisma/client"
import { revalidatePath } from "next/cache"

export async function listEvents(filter?: { type?: EventType | "ALL"; upcoming?: boolean }) {
  await requireAuth()

  const where: Record<string, unknown> = {}
  if (filter?.type && filter.type !== "ALL") where.eventType = filter.type
  if (filter?.upcoming) where.startTime = { gte: new Date() }

  const events = await prisma.schedule.findMany({
    where,
    orderBy: { startTime: "asc" },
    include: {
      module: { select: { id: true, title: true, code: true } },
      trainer: { select: { name: true } },
      registrations: { select: { id: true } },
    },
  })

  return events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    title: e.title,
    description: e.description,
    location: e.location,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    maxParticipants: e.maxParticipants,
    registeredCount: e.registrations.length,
    trainerName: e.trainer.name,
    module: e.module
      ? { id: e.module.id, title: e.module.title, code: e.module.code }
      : null,
  }))
}

export async function createEvent(data: {
  eventType: EventType
  title?: string | null
  description?: string | null
  moduleId?: string | null
  location: string
  startTime: string
  endTime: string
  maxParticipants: number
  trainerId?: string | null
}) {
  const session = await requireTrainer()

  if (!data.location.trim()) return { success: false, error: "Ort erforderlich." }
  const start = new Date(data.startTime)
  const end = new Date(data.endTime)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { success: false, error: "Zeiten ungueltig." }
  }

  const trainerId = data.trainerId ?? session.user.id

  const event = await prisma.schedule.create({
    data: {
      eventType: data.eventType,
      title: data.title?.trim() || null,
      description: data.description?.trim() || null,
      moduleId: data.moduleId ?? null,
      location: data.location.trim(),
      startTime: start,
      endTime: end,
      maxParticipants: Math.max(1, data.maxParticipants),
      trainerId,
    },
  })

  revalidatePath("/events")
  revalidatePath("/admin/calendar")
  return { success: true, id: event.id }
}
