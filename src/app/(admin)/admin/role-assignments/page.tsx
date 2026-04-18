import { requireAdmin } from "@/lib/auth-guard"
import { listRoleAssignments } from "@/lib/actions/role-assignments"
import { RoleAssignmentsClient } from "./role-assignments-client"

export default async function RoleAssignmentsPage() {
  await requireAdmin()
  const rows = await listRoleAssignments()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Multiplikator-/Champion-Zuweisungen</h1>
        <p className="text-muted-foreground mt-1">
          Befristete Rollen mit Jahresbestaetigung. 30 Tage vor Ablauf erhaelt
          das Admin-Team eine Benachrichtigung.
        </p>
      </div>
      <RoleAssignmentsClient initial={rows} />
    </div>
  )
}
