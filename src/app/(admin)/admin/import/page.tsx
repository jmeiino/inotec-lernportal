import { requireAdmin } from "@/lib/auth-guard"
import { ImportClient } from "./import-client"

export default async function ImportPage() {
  await requireAdmin()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CSV-Import</h1>
        <p className="text-muted-foreground mt-1">
          Bulk-Anlage und -Aktualisierung von Nutzern. Erwartete Spalten:
          <code className="ml-1 px-1 py-0.5 bg-muted rounded text-xs">
            name,email,abteilung,businessrole,rolle
          </code>
        </p>
      </div>
      <ImportClient />
    </div>
  )
}
