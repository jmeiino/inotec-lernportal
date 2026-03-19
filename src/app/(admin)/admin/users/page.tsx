import { requireAdmin } from "@/lib/auth-guard"
import { getAdminUsers, getFilterOptions } from "@/lib/actions/admin"
import { UsersClient } from "./users-client"

export default async function UsersPage() {
  await requireAdmin()

  const [users, filterOptions] = await Promise.all([
    getAdminUsers(),
    getFilterOptions(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nutzerverwaltung</h1>
        <p className="text-muted-foreground mt-1">
          Nutzer verwalten, Rollen zuweisen und Fortschritt einsehen.
        </p>
      </div>

      <UsersClient
        initialUsers={users}
        departments={filterOptions.departments}
        tracks={filterOptions.tracks}
      />
    </div>
  )
}
