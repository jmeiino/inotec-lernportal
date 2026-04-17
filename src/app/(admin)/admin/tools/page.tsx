import { requireTrainer } from "@/lib/auth-guard"
import {
  listUsersWithToolAccess,
  getToolUsageSummary,
} from "@/lib/actions/tools"
import { TOOL_LIST } from "@/lib/tool-constants"
import { ToolsAdminClient } from "./tools-admin-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTool } from "@/lib/utils"

export default async function ToolsAdminPage() {
  await requireTrainer()
  const [users, summary] = await Promise.all([
    listUsersWithToolAccess(),
    getToolUsageSummary(30),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KI-Tool-Zugaenge</h1>
        <p className="text-muted-foreground mt-1">
          Freigaben je Tool und Nutzungsdaten der letzten {summary.days} Tage.
          ChatGPT ist Standard fuer alle, Claude und OpenWebUI nach manueller
          Admin-Freigabe.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TOOL_LIST.map((t) => (
          <Card key={t}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {formatTool(t)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {summary.counts[t]}
                </span>
                <span className="text-xs text-muted-foreground">
                  Anfragen / {summary.usersPerTool[t]} aktive Nutzer
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ToolsAdminClient initial={users} />
    </div>
  )
}
