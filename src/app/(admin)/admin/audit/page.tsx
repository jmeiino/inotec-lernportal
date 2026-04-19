import { requireAdmin } from "@/lib/auth-guard"
import { listAuditLogs, listAuditFilterOptions } from "@/lib/actions/audit"
import { AuditClient } from "./audit-client"

export default async function AuditPage() {
  await requireAdmin()
  const [rows, options] = await Promise.all([
    listAuditLogs(),
    listAuditFilterOptions(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit-Log</h1>
        <p className="text-muted-foreground mt-1">
          Nachvollziehbarkeit aller sicherheitsrelevanten Admin-Aktionen.
        </p>
      </div>
      <AuditClient initialRows={rows} options={options} />
    </div>
  )
}
