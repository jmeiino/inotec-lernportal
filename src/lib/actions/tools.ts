"use server"

import { prisma } from "@/lib/prisma"
import {
  requireAuth,
  requireAdmin,
  requireTrainer,
} from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { Tool } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { TOOL_LIST, DEFAULT_TOOL_ENABLED } from "@/lib/tool-constants"

async function loadAccessMap(userId: string): Promise<Record<Tool, boolean>> {
  const rows = await prisma.toolAccess.findMany({
    where: { userId },
    select: { tool: true, enabled: true },
  })
  const map: Record<Tool, boolean> = { ...DEFAULT_TOOL_ENABLED }
  for (const r of rows) map[r.tool] = r.enabled
  return map
}

export async function getEffectiveToolAccess(userId: string) {
  await requireAuth()
  return loadAccessMap(userId)
}

export async function getMyToolAccess() {
  const session = await requireAuth()
  return loadAccessMap(session.user.id)
}

export async function setToolAccess(
  userId: string,
  tool: Tool,
  enabled: boolean
) {
  const session = await requireAdmin()

  await prisma.toolAccess.upsert({
    where: { userId_tool: { userId, tool } },
    update: { enabled, updatedBy: session.user.id },
    create: { userId, tool, enabled, updatedBy: session.user.id },
  })

  revalidatePath("/admin/tools")
  revalidatePath("/admin/users")
  return { success: true }
}

export async function listUsersWithToolAccess() {
  await requireTrainer()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      businessRole: true,
      role: true,
      toolAccess: { select: { tool: true, enabled: true } },
    },
  })

  const usageRows = await prisma.toolUsageLog.groupBy({
    by: ["userId", "tool"],
    where: { occurredAt: { gte: thirtyDaysAgo } },
    _count: { _all: true },
  })
  const usageKey = (userId: string, tool: Tool) => `${userId}:${tool}`
  const usageMap = new Map<string, number>()
  for (const row of usageRows) {
    usageMap.set(usageKey(row.userId, row.tool), row._count._all)
  }

  return users.map((u) => {
    const map: Record<Tool, boolean> = { ...DEFAULT_TOOL_ENABLED }
    for (const t of u.toolAccess) map[t.tool] = t.enabled

    const usage: Record<Tool, number> = { CHATGPT: 0, CLAUDE: 0, OPENWEBUI: 0 }
    for (const tool of TOOL_LIST) {
      usage[tool] = usageMap.get(usageKey(u.id, tool)) ?? 0
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      department: u.department,
      businessRole: u.businessRole,
      role: u.role,
      access: map,
      usage30d: usage,
    }
  })
}

export async function logToolUsage(data: {
  tool: Tool
  promptHash?: string | null
  tokensIn?: number | null
  tokensOut?: number | null
  metadata?: Record<string, unknown> | null
}) {
  const session = await requireAuth()

  const access = await loadAccessMap(session.user.id)
  if (!access[data.tool]) {
    return {
      success: false,
      error: "Kein Zugriff auf dieses Tool fuer diesen Nutzer.",
    }
  }

  await prisma.toolUsageLog.create({
    data: {
      userId: session.user.id,
      tool: data.tool,
      promptHash: data.promptHash ?? null,
      tokensIn: data.tokensIn ?? null,
      tokensOut: data.tokensOut ?? null,
      metadata: data.metadata
        ? (data.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  })

  return { success: true }
}

export async function getToolUsageSummary(days = 30) {
  await requireTrainer()

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const grouped = await prisma.toolUsageLog.groupBy({
    by: ["tool"],
    where: { occurredAt: { gte: since } },
    _count: { _all: true },
  })

  const distinctUsers = await prisma.toolUsageLog.findMany({
    where: { occurredAt: { gte: since } },
    distinct: ["userId", "tool"],
    select: { userId: true, tool: true },
  })

  const usersPerTool: Record<Tool, number> = { CHATGPT: 0, CLAUDE: 0, OPENWEBUI: 0 }
  for (const row of distinctUsers) usersPerTool[row.tool] += 1

  const counts: Record<Tool, number> = { CHATGPT: 0, CLAUDE: 0, OPENWEBUI: 0 }
  for (const row of grouped) counts[row.tool] = row._count._all

  return {
    sinceIso: since.toISOString(),
    days,
    counts,
    usersPerTool,
  }
}
