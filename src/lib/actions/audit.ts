"use server"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-guard"
import { Prisma } from "@prisma/client"

export type AuditAction =
  | "ROLE_CHANGE"
  | "BUSINESS_ROLE_CHANGE"
  | "TOOL_ACCESS_CHANGE"
  | "WP_APPROVED"
  | "WP_REWORK"
  | "WP_PUBLISHED"
  | "SURVEY_CREATED"
  | "SURVEY_TOGGLED"
  | "ROLE_ASSIGNMENT_CREATED"
  | "ROLE_ASSIGNMENT_RENEWED"
  | "ROLE_ASSIGNMENT_REVOKED"
  | "MANAGER_CHANGE"

export async function writeAudit(params: {
  actorId: string
  action: AuditAction
  targetType: string
  targetId?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      beforeJson: params.before
        ? (params.before as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      afterJson: params.after
        ? (params.after as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  })
}

export interface AuditFilters {
  actorId?: string
  action?: string
  targetType?: string
  limit?: number
}

export async function listAuditLogs(filters: AuditFilters = {}) {
  await requireAdmin()

  const where: Record<string, unknown> = {}
  if (filters.actorId) where.actorId = filters.actorId
  if (filters.action) where.action = filters.action
  if (filters.targetType) where.targetType = filters.targetType

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 200,
  })

  const actorIds = Array.from(new Set(rows.map((r) => r.actorId)))
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true },
  })
  const actorMap = new Map(actors.map((a) => [a.id, a]))

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    actorName: actorMap.get(r.actorId)?.name ?? r.actorId,
    before: r.beforeJson,
    after: r.afterJson,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function listAuditFilterOptions() {
  await requireAdmin()
  const actions = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ["action"],
  })
  const targetTypes = await prisma.auditLog.findMany({
    select: { targetType: true },
    distinct: ["targetType"],
  })
  return {
    actions: actions.map((a) => a.action).sort(),
    targetTypes: targetTypes.map((t) => t.targetType).sort(),
  }
}
