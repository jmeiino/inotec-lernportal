import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LearnerSidebar } from "@/components/layout/learner-sidebar"
import { prisma } from "@/lib/prisma"

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  const directReports = await prisma.user.count({
    where: { managerId: session.user.id },
  })

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <LearnerSidebar hasTeam={directReports > 0} />
      <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
    </div>
  )
}
