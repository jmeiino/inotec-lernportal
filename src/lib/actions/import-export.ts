"use server"

import { prisma } from "@/lib/prisma"
import { requireAdmin, requireTrainer } from "@/lib/auth-guard"
import { BusinessRole, Role, SubmissionStatus, Tool } from "@prisma/client"
import { revalidatePath } from "next/cache"

const VALID_ROLES = new Set<Role>([
  "LEARNER",
  "TRAINER",
  "ADMIN",
  "MULTIPLICATOR",
  "CHAMPION",
])
const VALID_BUSINESS_ROLES = new Set<BusinessRole>([
  "VERTRIEB",
  "PRODUKTION",
  "VERWALTUNG",
  "IT",
  "HR",
  "FUEHRUNG",
])

export type ImportRow = {
  line: number
  name: string
  email: string
  department: string | null
  businessRole: BusinessRole | null
  role: Role
  errors: string[]
}

export async function previewUserImport(csv: string): Promise<{
  rows: ImportRow[]
  errorCount: number
}> {
  await requireAdmin()

  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { rows: [], errorCount: 0 }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const idx = (col: string) => header.indexOf(col)

  const nameIdx = idx("name")
  const emailIdx = idx("email")
  const deptIdx = idx("abteilung")
  const brIdx = idx("businessrole")
  const roleIdx = idx("rolle")

  const rows: ImportRow[] = []
  let errors = 0

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    const errs: string[] = []
    const name = nameIdx >= 0 ? cells[nameIdx] : ""
    const email = emailIdx >= 0 ? cells[emailIdx] : ""
    const department = deptIdx >= 0 ? cells[deptIdx] || null : null
    const brRaw = brIdx >= 0 ? cells[brIdx]?.toUpperCase() : ""
    const roleRaw = roleIdx >= 0 ? cells[roleIdx]?.toUpperCase() || "LEARNER" : "LEARNER"

    if (!name) errs.push("Name fehlt")
    if (!email || !email.includes("@")) errs.push("Email ungueltig")

    let businessRole: BusinessRole | null = null
    if (brRaw) {
      if (VALID_BUSINESS_ROLES.has(brRaw as BusinessRole)) {
        businessRole = brRaw as BusinessRole
      } else {
        errs.push(`BusinessRole ungueltig (${brRaw})`)
      }
    }

    let role: Role = Role.LEARNER
    if (VALID_ROLES.has(roleRaw as Role)) {
      role = roleRaw as Role
    } else {
      errs.push(`Rolle ungueltig (${roleRaw})`)
    }

    if (errs.length > 0) errors += 1
    rows.push({
      line: i + 1,
      name,
      email,
      department,
      businessRole,
      role,
      errors: errs,
    })
  }

  return { rows, errorCount: errors }
}

export async function applyUserImport(rows: ImportRow[]) {
  await requireAdmin()

  const valid = rows.filter((r) => r.errors.length === 0)
  let created = 0
  let updated = 0

  for (const r of valid) {
    const existing = await prisma.user.findUnique({ where: { email: r.email } })
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          department: r.department,
          businessRole: r.businessRole,
          role: r.role,
        },
      })
      updated += 1
    } else {
      await prisma.user.create({
        data: {
          name: r.name,
          email: r.email,
          department: r.department,
          businessRole: r.businessRole,
          role: r.role,
        },
      })
      created += 1
    }
  }

  revalidatePath("/admin/users")
  revalidatePath("/admin/import")
  return { created, updated, skipped: rows.length - valid.length }
}

export async function getYearlyReport(userId: string) {
  await requireTrainer()

  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      businessRole: true,
      role: true,
    },
  })
  if (!user) return null

  const [progress, certificates, submissions, feedback, toolUsage] =
    await Promise.all([
      prisma.moduleProgress.findMany({
        where: { userId },
        include: {
          module: {
            select: {
              code: true,
              title: true,
              track: { select: { name: true, competenceLevel: true } },
            },
          },
        },
      }),
      prisma.certificate.findMany({
        where: { userId },
        include: { track: { select: { name: true, competenceLevel: true } } },
      }),
      prisma.workProductSubmission.findMany({
        where: { userId, status: SubmissionStatus.APPROVED },
        select: {
          title: true,
          reviewedAt: true,
          module: {
            select: {
              code: true,
              title: true,
              track: { select: { competenceLevel: true } },
            },
          },
        },
      }),
      prisma.moduleFeedback.findMany({
        where: { userId, submittedAt: { gte: since } },
        select: { relevance: true, quality: true },
      }),
      prisma.toolUsageLog.groupBy({
        by: ["tool"],
        where: { userId, occurredAt: { gte: since } },
        _count: { _all: true },
      }),
    ])

  const completedModules = progress.filter((p) => p.status === "COMPLETED")
  const inProgress = progress.filter((p) => p.status === "IN_PROGRESS")

  const avgRelevance =
    feedback.length > 0
      ? feedback.reduce((s, f) => s + f.relevance, 0) / feedback.length
      : null
  const avgQuality =
    feedback.length > 0
      ? feedback.reduce((s, f) => s + f.quality, 0) / feedback.length
      : null

  const usageByTool: Record<Tool, number> = {
    CHATGPT: 0,
    CLAUDE: 0,
    OPENWEBUI: 0,
  }
  for (const u of toolUsage) usageByTool[u.tool] = u._count._all

  return {
    user,
    completedModules: completedModules.map((p) => ({
      code: p.module.code,
      title: p.module.title,
      trackName: p.module.track.name,
      competenceLevel: p.module.track.competenceLevel,
      completedAt: p.completedAt?.toISOString() ?? null,
    })),
    inProgress: inProgress.map((p) => ({
      code: p.module.code,
      title: p.module.title,
      trackName: p.module.track.name,
      progressPct: p.progressPct,
    })),
    certificates: certificates.map((c) => ({
      certNumber: c.certNumber,
      trackName: c.track.name,
      competenceLevel: c.track.competenceLevel,
      issuedAt: c.issuedAt.toISOString(),
    })),
    approvedSubmissions: submissions.map((s) => ({
      title: s.title,
      moduleCode: s.module.code,
      moduleTitle: s.module.title,
      competenceLevel: s.module.track.competenceLevel,
      reviewedAt: s.reviewedAt?.toISOString() ?? null,
    })),
    feedback: {
      count: feedback.length,
      avgRelevance,
      avgQuality,
    },
    usageByTool,
    sinceIso: since.toISOString(),
  }
}

export async function exportYearlyReportCsv(userId: string) {
  const data = await getYearlyReport(userId)
  if (!data) return ""

  const lines: string[] = []
  lines.push(`# Jahresbericht ${data.user.name}`)
  lines.push(`# Email,${data.user.email}`)
  lines.push(`# Abteilung,${data.user.department ?? ""}`)
  lines.push(`# Business-Rolle,${data.user.businessRole ?? ""}`)
  lines.push(`# Rolle,${data.user.role}`)
  lines.push("")
  lines.push("Sektion,Wert,Detail")
  lines.push(`Module abgeschlossen,${data.completedModules.length},`)
  lines.push(`Module in Bearbeitung,${data.inProgress.length},`)
  lines.push(`Zertifikate,${data.certificates.length},`)
  lines.push(`Approved Arbeitsprodukte (Jahr),${data.approvedSubmissions.length},`)
  lines.push(
    `Feedback (Jahr),${data.feedback.count},Ø Relevance ${data.feedback.avgRelevance?.toFixed(2) ?? "-"} / Ø Quality ${data.feedback.avgQuality?.toFixed(2) ?? "-"}`
  )
  for (const [tool, n] of Object.entries(data.usageByTool)) {
    lines.push(`Tool-Nutzung ${tool},${n},letzte 365 Tage`)
  }
  lines.push("")
  lines.push("Abgeschlossene Module:")
  lines.push("Code,Modul,Track,Stufe,Datum")
  for (const m of data.completedModules) {
    lines.push(
      [m.code, `"${m.title}"`, `"${m.trackName}"`, m.competenceLevel, m.completedAt ?? ""].join(",")
    )
  }
  lines.push("")
  lines.push("Approved Arbeitsprodukte:")
  lines.push("Modul,Stufe,Titel,Datum")
  for (const s of data.approvedSubmissions) {
    lines.push(
      [s.moduleCode, s.competenceLevel, `"${s.title}"`, s.reviewedAt ?? ""].join(",")
    )
  }

  return lines.join("\n")
}
