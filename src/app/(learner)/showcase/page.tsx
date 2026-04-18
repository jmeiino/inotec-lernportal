import { requireAuth } from "@/lib/auth-guard"
import { listShowcase } from "@/lib/actions/showcase"
import { ShowcaseClient } from "./showcase-client"

export default async function ShowcasePage() {
  await requireAuth()
  const data = await listShowcase()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Showcase</h1>
        <p className="text-muted-foreground mt-1">
          Freigegebene Arbeitsprodukte der Kolleginnen und Kollegen — als
          Inspiration und Vorlage.
        </p>
      </div>
      <ShowcaseClient initial={data} />
    </div>
  )
}
