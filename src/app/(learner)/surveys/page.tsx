import { requireAuth } from "@/lib/auth-guard"
import { listActiveSurveysForUser } from "@/lib/actions/surveys"
import { SurveysClient } from "./surveys-client"

export default async function SurveysPage() {
  await requireAuth()
  const surveys = await listActiveSurveysForUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Umfragen</h1>
        <p className="text-muted-foreground mt-1">
          Ihre Rueckmeldungen steuern die Schulungsplanung. Die Auswertung
          erfolgt anonym auf Abteilungsebene.
        </p>
      </div>
      <SurveysClient initialSurveys={surveys} />
    </div>
  )
}
