"use server"

import { prisma } from "@/lib/prisma"
import { requireTrainer } from "@/lib/auth-guard"
import type { ModuleFormat } from "@prisma/client"

export async function getCoursesTree() {
  await requireTrainer()

  const tracks = await prisma.track.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              sortOrder: true,
            },
          },
          materials: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              filePath: true,
              fileSize: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  })

  return tracks
}

export async function getModuleDetail(moduleId: string) {
  await requireTrainer()

  const mod = await prisma.module.findUniqueOrThrow({
    where: { id: moduleId },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" },
      },
      materials: {
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  return {
    id: mod.id,
    trackId: mod.trackId,
    code: mod.code,
    title: mod.title,
    description: mod.description,
    durationHours: mod.durationHours,
    format: mod.format,
    sortOrder: mod.sortOrder,
    prerequisites: mod.prerequisites as string[],
    lessons: mod.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      contentMd: l.contentMd,
      sortOrder: l.sortOrder,
    })),
    materials: mod.materials.map((m) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      filePath: m.filePath,
      fileSize: m.fileSize,
      sortOrder: m.sortOrder,
    })),
  }
}

export async function updateModule(
  moduleId: string,
  data: {
    title: string
    code: string
    description: string | null
    durationHours: number
    format: ModuleFormat
    prerequisites: string[]
  }
) {
  await requireTrainer()

  await prisma.module.update({
    where: { id: moduleId },
    data: {
      title: data.title,
      code: data.code,
      description: data.description,
      durationHours: data.durationHours,
      format: data.format,
      prerequisites: data.prerequisites,
    },
  })

  return { success: true }
}

export async function createLesson(
  moduleId: string,
  data: { title: string; contentMd: string }
) {
  await requireTrainer()

  const maxOrder = await prisma.lesson.aggregate({
    where: { moduleId },
    _max: { sortOrder: true },
  })

  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title: data.title,
      contentMd: data.contentMd,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  })

  return { id: lesson.id }
}

export async function updateLesson(
  lessonId: string,
  data: { title: string; contentMd: string }
) {
  await requireTrainer()

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: data.title,
      contentMd: data.contentMd,
    },
  })

  return { success: true }
}

export async function deleteLesson(lessonId: string) {
  await requireTrainer()

  await prisma.lesson.delete({
    where: { id: lessonId },
  })

  return { success: true }
}

export async function reorderLessons(moduleId: string, lessonIds: string[]) {
  await requireTrainer()

  await prisma.$transaction(
    lessonIds.map((id, index) =>
      prisma.lesson.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })
    )
  )

  return { success: true }
}

export async function deleteMaterial(materialId: string) {
  await requireTrainer()

  await prisma.material.delete({
    where: { id: materialId },
  })

  return { success: true }
}
