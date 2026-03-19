import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LearnerSidebar } from "@/components/layout/learner-sidebar"

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <LearnerSidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
    </div>
  )
}
