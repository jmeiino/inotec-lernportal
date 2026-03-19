import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { Providers } from "@/components/providers"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")
  if (session.user.role !== "ADMIN" && session.user.role !== "TRAINER") {
    redirect("/dashboard")
  }

  return (
    <Providers>
      <div className="min-h-screen flex flex-col md:flex-row">
        <AdminSidebar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </Providers>
  )
}
