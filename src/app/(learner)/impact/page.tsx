import { requireAuth } from "@/lib/auth-guard"
import { listImpactStories } from "@/lib/actions/impact"
import { ImpactClient } from "./impact-client"

export default async function ImpactPage() {
  await requireAuth()
  const stories = await listImpactStories()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Impact-Stories</h1>
        <p className="text-muted-foreground mt-1">
          Kurze Erfolgsgeschichten mit messbarem Ergebnis — teilen Sie Ihre
          Lessons Learned.
        </p>
      </div>
      <ImpactClient initial={stories} />
    </div>
  )
}
