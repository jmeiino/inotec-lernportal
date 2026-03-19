import { requireAuth } from "@/lib/auth-guard"
import { getCatalogData } from "@/lib/actions/catalog"
import { CatalogContent } from "./catalog-content"

export default async function CatalogPage() {
  const session = await requireAuth()
  const { tracks } = await getCatalogData(session.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kurskatalog</h1>
        <p className="text-muted-foreground mt-1">
          Durchsuchen Sie verfügbare Schulungen und Lernpfade.
        </p>
      </div>

      <CatalogContent tracks={tracks} userId={session.user.id} />
    </div>
  )
}
