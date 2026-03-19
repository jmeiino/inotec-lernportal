import NextAuth from "next-auth"
import type { Adapter } from "next-auth/adapters"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import type { Role } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      image?: string | null
      role: Role
      department?: string | null
    }
  }
  interface User {
    role: Role
    department?: string | null
  }
}

const providers: any[] = []

// Azure AD for production
if (process.env.AZURE_AD_CLIENT_ID) {
  // Dynamic import to avoid errors when azure-ad provider is not needed
  const AzureADProvider = require("next-auth/providers/azure-ad").default
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    })
  )
}

// Credentials provider for development
if (process.env.NODE_ENV === "development" || !process.env.AZURE_AD_CLIENT_ID) {
  providers.push(
    CredentialsProvider({
      name: "Development Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@inotec.local" },
        name: { label: "Name", type: "text", placeholder: "Admin User" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        const email = credentials.email as string
        const name = (credentials.name as string) || email.split("@")[0]

        let user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
          user = await prisma.user.create({
            data: { email, name, role: "ADMIN" },
          })
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        }
      },
    })
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.department = (user as any).department
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.department = token.department as string | null
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
  },
})
