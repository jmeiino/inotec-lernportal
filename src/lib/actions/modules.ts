"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getModuleDetail(moduleId: string, userId: string) {
  try {
    const mod = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        track: {
          select: { id: true, name: true, level: true },
        },
        lessons: {
          orderBy: { sortOrder: "asc" },
          include: {
            lessonProgress: {
              where: { userId },
              take: 1,
            },
          },
        },
        materials: {
          orderBy: { sortOrder: "asc" },
        },
        quizzes: {
          select: { id: true },
          take: 1,
        },
        progress: {
          where: { userId },
          take: 1,
        },
      },
    })

    if (!mod) return null

    const prerequisites = (mod.prerequisites as string[]) || []
    let prerequisitesMet = true
    let prerequisiteModules: { id: string; title: string; code: string; completed: boolean }[] = []

    if (prerequisites.length > 0) {
      const prereqModules = await prisma.module.findMany({
        where: { id: { in: prerequisites } },
        select: { id: true, title: true, code: true },
      })

      const prereqProgress = await prisma.moduleProgress.findMany({
        where: {
          userId,
          moduleId: { in: prerequisites },
          status: "COMPLETED",
        },
        select: { moduleId: true },
      })

      const completedSet = new Set(prereqProgress.map((p) => p.moduleId))

      prerequisiteModules = prereqModules.map((pm) => ({
        id: pm.id,
        title: pm.title,
        code: pm.code,
        completed: completedSet.has(pm.id),
      }))

      prerequisitesMet = prerequisites.every((id) => completedSet.has(id))
    }

    const totalLessons = mod.lessons.length
    const completedLessons = mod.lessons.filter(
      (l) => l.lessonProgress[0]?.completed
    ).length
    const allLessonsCompleted = totalLessons > 0 && completedLessons === totalLessons

    return {
      id: mod.id,
      code: mod.code,
      title: mod.title,
      description: mod.description,
      durationHours: mod.durationHours,
      format: mod.format,
      track: mod.track,
      lessons: mod.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        sortOrder: l.sortOrder,
        completed: l.lessonProgress[0]?.completed ?? false,
      })),
      materials: mod.materials.map((m) => ({
        id: m.id,
        title: m.title,
        filePath: m.filePath,
        type: m.type,
        fileSize: m.fileSize,
      })),
      hasQuiz: mod.quizzes.length > 0,
      quizId: mod.quizzes[0]?.id ?? null,
      progressPct: mod.progress[0]?.progressPct ?? 0,
      status: mod.progress[0]?.status ?? "NOT_STARTED",
      totalLessons,
      completedLessons,
      allLessonsCompleted,
      prerequisitesMet,
      prerequisiteModules,
    }
  } catch (error) {
    console.error("Error fetching module detail:", error)
    return null
  }
}

export async function getLesson(lessonId: string, userId: string) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            code: true,
            track: { select: { id: true, name: true } },
          },
        },
        lessonProgress: {
          where: { userId },
          take: 1,
        },
      },
    })

    if (!lesson) return null

    // Get sibling lessons for navigation
    const siblingLessons = await prisma.lesson.findMany({
      where: { moduleId: lesson.module.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, sortOrder: true },
    })

    const currentIndex = siblingLessons.findIndex((l) => l.id === lessonId)
    const prevLesson = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null
    const nextLesson =
      currentIndex < siblingLessons.length - 1
        ? siblingLessons[currentIndex + 1]
        : null

    return {
      id: lesson.id,
      title: lesson.title,
      contentMd: lesson.contentMd,
      sortOrder: lesson.sortOrder,
      completed: lesson.lessonProgress[0]?.completed ?? false,
      module: lesson.module,
      prevLesson,
      nextLesson,
      totalLessons: siblingLessons.length,
      currentIndex: currentIndex + 1,
    }
  } catch (error) {
    console.error("Error fetching lesson:", error)
    return null
  }
}

export async function markLessonComplete(userId: string, lessonId: string) {
  try {
    // Upsert lesson progress
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { completed: true, completedAt: new Date() },
      create: { userId, lessonId, completed: true, completedAt: new Date() },
    })

    // Get the lesson's module to recalculate progress
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { moduleId: true },
    })

    if (!lesson) return { success: false, error: "Lektion nicht gefunden" }

    // Calculate module progress
    const totalLessons = await prisma.lesson.count({
      where: { moduleId: lesson.moduleId },
    })

    const completedLessons = await prisma.lessonProgress.count({
      where: {
        userId,
        completed: true,
        lesson: { moduleId: lesson.moduleId },
      },
    })

    const progressPct =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    const isCompleted = completedLessons === totalLessons

    // Upsert module progress
    await prisma.moduleProgress.upsert({
      where: { userId_moduleId: { userId, moduleId: lesson.moduleId } },
      update: {
        progressPct,
        status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
        completedAt: isCompleted ? new Date() : null,
      },
      create: {
        userId,
        moduleId: lesson.moduleId,
        progressPct,
        status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
        completedAt: isCompleted ? new Date() : null,
      },
    })

    revalidatePath(`/modules/${lesson.moduleId}`)
    revalidatePath("/dashboard")

    return { success: true, progressPct, isCompleted }
  } catch (error) {
    console.error("Error marking lesson complete:", error)
    return { success: false, error: "Fehler beim Aktualisieren" }
  }
}
