"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { NotificationType } from "@prisma/client"
import { revalidatePath } from "next/cache"

export async function createNotification(data: {
  userId: string
  type: NotificationType
  title: string
  bodyMd: string
  linkUrl?: string | null
}) {
  await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      bodyMd: data.bodyMd,
      linkUrl: data.linkUrl ?? null,
    },
  })
}

export async function createNotificationForMany(
  userIds: string[],
  data: {
    type: NotificationType
    title: string
    bodyMd: string
    linkUrl?: string | null
  }
) {
  if (userIds.length === 0) return
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: data.type,
      title: data.title,
      bodyMd: data.bodyMd,
      linkUrl: data.linkUrl ?? null,
    })),
  })
}

export async function listMyNotifications(limit = 30) {
  const session = await requireAuth()
  const rows = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    bodyMd: n.bodyMd,
    linkUrl: n.linkUrl,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  }))
}

export async function getUnreadNotificationCount() {
  const session = await requireAuth()
  return prisma.notification.count({
    where: { userId: session.user.id, readAt: null },
  })
}

export async function markNotificationRead(id: string) {
  const session = await requireAuth()
  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { readAt: new Date() },
  })
  revalidatePath("/notifications")
  return { success: true }
}

export async function markAllNotificationsRead() {
  const session = await requireAuth()
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  })
  revalidatePath("/notifications")
  return { success: true }
}
