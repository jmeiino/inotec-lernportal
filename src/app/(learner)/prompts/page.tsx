import { requireAuth } from "@/lib/auth-guard"
import { listPrompts } from "@/lib/actions/prompts"
import { PromptsClient } from "./prompts-client"

export default async function PromptsPage() {
  const session = await requireAuth()
  const prompts = await listPrompts()
  const canEdit = ["ADMIN", "TRAINER", "MULTIPLICATOR", "CHAMPION"].includes(
    session.user.role
  )
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prompt-Bibliothek</h1>
        <p className="text-muted-foreground mt-1">
          Geprueftе Prompts und Workflows — kopieren, anpassen, weiterverwenden.
        </p>
      </div>
      <PromptsClient initial={prompts} canEdit={canEdit} />
    </div>
  )
}
