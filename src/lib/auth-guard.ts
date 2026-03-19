import { auth } from "./auth"
import { redirect } from "next/navigation"
import type { Role } from "@prisma/client"

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")
  return session
}

export async function requireRole(roles: Role[]) {
  const session = await requireAuth()
  if (!roles.includes(session.user.role)) redirect("/")
  return session
}

export async function requireAdmin() {
  return requireRole(["ADMIN"])
}

export async function requireTrainer() {
  return requireRole(["ADMIN", "TRAINER"])
}
