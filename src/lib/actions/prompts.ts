"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireReviewer } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { BusinessRole, Tool } from "@prisma/client"

export async function listPrompts(filter?: {
  businessRole?: BusinessRole | "ALL"
  tool?: Tool | "ALL"
  tag?: string
}) {
  await requireAuth()
  const where: Record<string, unknown> = {}
  if (filter?.businessRole && filter.businessRole !== "ALL") {
    where.businessRole = filter.businessRole
  }
  if (filter?.tool && filter.tool !== "ALL") where.tool = filter.tool
  if (filter?.tag) where.tags = { has: filter.tag.toLowerCase() }

  const rows = await prisma.promptTemplate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  })
  const authorIds = Array.from(new Set(rows.map((r) => r.authorId)))
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true },
  })
  const authorMap = new Map(authors.map((a) => [a.id, a.name]))

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    businessRole: r.businessRole,
    tool: r.tool,
    tags: r.tags,
    authorName: authorMap.get(r.authorId) ?? "—",
    updatedAt: r.updatedAt.toISOString(),
  }))
}

export async function createPrompt(data: {
  title: string
  body: string
  businessRole?: BusinessRole | null
  tool?: Tool | null
  tags?: string[]
}) {
  const session = await requireReviewer()
  if (!data.title.trim() || !data.body.trim()) {
    return { success: false, error: "Titel und Body sind Pflicht." }
  }
  await prisma.promptTemplate.create({
    data: {
      authorId: session.user.id,
      title: data.title.trim(),
      body: data.body.trim(),
      businessRole: data.businessRole ?? null,
      tool: data.tool ?? null,
      tags: Array.from(
        new Set(
          (data.tags ?? [])
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t.length > 0)
        )
      ).slice(0, 8),
    },
  })
  revalidatePath("/prompts")
  return { success: true }
}

export async function updatePrompt(
  id: string,
  data: {
    title: string
    body: string
    businessRole?: BusinessRole | null
    tool?: Tool | null
    tags?: string[]
  }
) {
  const session = await requireReviewer()
  const existing = await prisma.promptTemplate.findUnique({ where: { id } })
  if (!existing) return { success: false, error: "Nicht gefunden." }
  if (
    existing.authorId !== session.user.id &&
    !["ADMIN", "TRAINER"].includes(session.user.role)
  ) {
    return { success: false, error: "Nur Autor oder Admin/Trainer." }
  }
  await prisma.promptTemplate.update({
    where: { id },
    data: {
      title: data.title.trim(),
      body: data.body.trim(),
      businessRole: data.businessRole ?? null,
      tool: data.tool ?? null,
      tags: Array.from(
        new Set(
          (data.tags ?? [])
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t.length > 0)
        )
      ).slice(0, 8),
    },
  })
  revalidatePath("/prompts")
  return { success: true }
}

export async function deletePrompt(id: string) {
  const session = await requireReviewer()
  const existing = await prisma.promptTemplate.findUnique({ where: { id } })
  if (!existing) return { success: false, error: "Nicht gefunden." }
  if (
    existing.authorId !== session.user.id &&
    !["ADMIN", "TRAINER"].includes(session.user.role)
  ) {
    return { success: false, error: "Nur Autor oder Admin/Trainer." }
  }
  await prisma.promptTemplate.delete({ where: { id } })
  revalidatePath("/prompts")
  return { success: true }
}
