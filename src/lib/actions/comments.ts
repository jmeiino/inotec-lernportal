"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export type CommentWithUser = {
  id: string
  content: string
  resolved: boolean
  createdAt: Date
  parentId: string | null
  user: {
    id: string
    name: string
    image: string | null
    role: "LEARNER" | "TRAINER" | "ADMIN"
  }
  replies: CommentWithUser[]
}

export async function getModuleComments(moduleId: string): Promise<CommentWithUser[]> {
  try {
    const comments = await prisma.comment.findMany({
      where: { moduleId, parentId: null },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, image: true, role: true },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { id: true, name: true, image: true, role: true },
            },
            replies: {
              orderBy: { createdAt: "asc" },
              include: {
                user: {
                  select: { id: true, name: true, image: true, role: true },
                },
                replies: {
                  orderBy: { createdAt: "asc" },
                  include: {
                    user: {
                      select: { id: true, name: true, image: true, role: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    // Recursively map to add empty replies arrays where needed
    const mapComment = (c: any): CommentWithUser => ({
      id: c.id,
      content: c.content,
      resolved: c.resolved,
      createdAt: c.createdAt,
      parentId: c.parentId,
      user: c.user,
      replies: (c.replies || []).map(mapComment),
    })

    return comments.map(mapComment)
  } catch (error) {
    console.error("Error fetching comments:", error)
    return []
  }
}

export async function getModuleCommentCount(moduleId: string): Promise<number> {
  try {
    return await prisma.comment.count({ where: { moduleId } })
  } catch {
    return 0
  }
}

export async function createComment(
  moduleId: string,
  content: string,
  parentId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Nicht angemeldet" }
    }

    if (!content.trim()) {
      return { success: false, error: "Kommentar darf nicht leer sein" }
    }

    await prisma.comment.create({
      data: {
        userId: session.user.id,
        moduleId,
        content: content.trim(),
        parentId: parentId || null,
      },
    })

    revalidatePath(`/modules/${moduleId}`)
    return { success: true }
  } catch (error) {
    console.error("Error creating comment:", error)
    return { success: false, error: "Fehler beim Erstellen des Kommentars" }
  }
}

export async function toggleCommentResolved(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Nicht angemeldet" }
    }

    if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
      return { success: false, error: "Keine Berechtigung" }
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { resolved: true, moduleId: true },
    })

    if (!comment) {
      return { success: false, error: "Kommentar nicht gefunden" }
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { resolved: !comment.resolved },
    })

    revalidatePath(`/modules/${comment.moduleId}`)
    return { success: true }
  } catch (error) {
    console.error("Error toggling comment resolved:", error)
    return { success: false, error: "Fehler beim Aktualisieren" }
  }
}

export async function deleteComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Nicht angemeldet" }
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, moduleId: true },
    })

    if (!comment) {
      return { success: false, error: "Kommentar nicht gefunden" }
    }

    const isOwner = comment.userId === session.user.id
    const isPrivileged = session.user.role === "TRAINER" || session.user.role === "ADMIN"

    if (!isOwner && !isPrivileged) {
      return { success: false, error: "Keine Berechtigung" }
    }

    await prisma.comment.delete({ where: { id: commentId } })

    revalidatePath(`/modules/${comment.moduleId}`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting comment:", error)
    return { success: false, error: "Fehler beim Loeschen" }
  }
}

export async function getUnresolvedCommentCount(trainerId: string): Promise<number> {
  try {
    return await prisma.comment.count({
      where: {
        resolved: false,
        parentId: null,
        module: {
          schedules: {
            some: {
              trainerId,
            },
          },
        },
      },
    })
  } catch {
    return 0
  }
}
