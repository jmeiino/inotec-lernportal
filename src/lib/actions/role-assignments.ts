"use server"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { BusinessRole, Role } from "@prisma/client"
import { createNotification } from "@/lib/actions/notifications"

const DEFAULT_DURATION_DAYS = 365

export async function assignRole(data: {
  userId: string
  role: Role
  businessRole?: BusinessRole | null
  validUntil?: string | null
}) {
  const session = await requireAdmin()

  if (!["MULTIPLICATOR", "CHAMPION"].includes(data.role)) {
    return {
      success: false,
      error: "Befristung gilt nur fuer Multiplikator/Champion.",
    }
  }

  const validUntil = data.validUntil
    ? new Date(data.validUntil)
    : new Date(Date.now() + DEFAULT_DURATION_DAYS * 24 * 60 * 60 * 1000)

  await prisma.roleAssignment.create({
    data: {
      userId: data.userId,
      role: data.role,
      businessRole: data.businessRole ?? null,
      validUntil,
      approvedById: session.user.id,
    },
  })

  await prisma.user.update({
    where: { id: data.userId },
    data: { role: data.role },
  })

  revalidatePath("/admin/role-assignments")
  revalidatePath("/admin/users")
  return { success: true }
}

export async function renewAssignment(id: string, addMonths = 12) {
  const session = await requireAdmin()
  const existing = await prisma.roleAssignment.findUnique({
    where: { id },
    select: { userId: true, validUntil: true, role: true },
  })
  if (!existing) return { success: false, error: "Nicht gefunden." }

  const newUntil = new Date(existing.validUntil)
  newUntil.setMonth(newUntil.getMonth() + addMonths)

  await prisma.roleAssignment.update({
    where: { id },
    data: { validUntil: newUntil, approvedById: session.user.id },
  })

  revalidatePath("/admin/role-assignments")
  return { success: true }
}

export async function revokeAssignment(id: string) {
  await requireAdmin()
  const existing = await prisma.roleAssignment.findUnique({
    where: { id },
    select: { userId: true, role: true },
  })
  if (!existing) return { success: false, error: "Nicht gefunden." }

  await prisma.roleAssignment.delete({ where: { id } })

  // User auf LEARNER zuruecksetzen, sofern keine andere aktive Zuweisung existiert
  const remaining = await prisma.roleAssignment.findFirst({
    where: { userId: existing.userId, validUntil: { gt: new Date() } },
    select: { role: true },
  })
  await prisma.user.update({
    where: { id: existing.userId },
    data: { role: remaining?.role ?? Role.LEARNER },
  })

  revalidatePath("/admin/role-assignments")
  revalidatePath("/admin/users")
  return { success: true }
}

export async function listRoleAssignments() {
  await requireAdmin()
  const rows = await prisma.roleAssignment.findMany({
    orderBy: { validUntil: "asc" },
  })
  const userIds = Array.from(new Set(rows.map((r) => r.userId)))
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, department: true },
  })
  const map = new Map(users.map((u) => [u.id, u]))

  return rows.map((r) => {
    const daysLeft = Math.floor(
      (r.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return {
      id: r.id,
      userId: r.userId,
      userName: map.get(r.userId)?.name ?? "—",
      department: map.get(r.userId)?.department ?? null,
      role: r.role,
      businessRole: r.businessRole,
      validFrom: r.validFrom.toISOString(),
      validUntil: r.validUntil.toISOString(),
      daysLeft,
      expired: daysLeft < 0,
      dueSoon: daysLeft >= 0 && daysLeft <= 30,
    }
  })
}

// Cron-Helper: Befristete Rollen, die abgelaufen sind, werden zurueckgesetzt.
// 30 Tage vor Ablauf wird eine Benachrichtigung fuer Admins angelegt.
export async function runRoleAssignmentMaintenance() {
  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const expiring = await prisma.roleAssignment.findMany({
    where: { validUntil: { gt: now, lte: in30Days } },
    select: { id: true, userId: true, role: true, validUntil: true },
  })
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  })

  for (const a of expiring) {
    const user = await prisma.user.findUnique({
      where: { id: a.userId },
      select: { name: true },
    })
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "MULTIPLIER_RENEWAL_DUE",
        title: `${a.role}-Zuweisung laeuft ab`,
        bodyMd: `${user?.name ?? a.userId} bis ${a.validUntil.toLocaleDateString("de-DE")} — bitte erneuern.`,
        linkUrl: "/admin/role-assignments",
      })
    }
  }

  const expired = await prisma.roleAssignment.findMany({
    where: { validUntil: { lte: now } },
    select: { id: true, userId: true, role: true },
  })
  for (const e of expired) {
    const remaining = await prisma.roleAssignment.findFirst({
      where: {
        userId: e.userId,
        validUntil: { gt: now },
        id: { not: e.id },
      },
      select: { role: true },
    })
    await prisma.user.update({
      where: { id: e.userId },
      data: { role: remaining?.role ?? Role.LEARNER },
    })
    await prisma.roleAssignment.delete({ where: { id: e.id } })
  }

  return {
    expiringCount: expiring.length,
    expiredCount: expired.length,
  }
}
