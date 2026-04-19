import { requireReviewer } from "@/lib/auth-guard"
import { getStrategicOverview } from "@/lib/actions/strategic"
import { StrategicClient } from "./strategic-client"

export default async function StrategicPage() {
  const session = await requireReviewer()
  const data = await getStrategicOverview()
  const isAdmin = session.user.role === "ADMIN"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">F3-Steuerkreis</h1>
        <p className="text-muted-foreground mt-1">
          Strategischer Ueberblick fuer die halbjaehrliche Review:
          Pyramiden-Reichweite, Submission-Trend und offene Entscheidungen.
        </p>
      </div>
      <StrategicClient data={data} isAdmin={isAdmin} />
    </div>
  )
}
