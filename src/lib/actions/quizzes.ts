"use server"

import { prisma } from "@/lib/prisma"
import { requireTrainer } from "@/lib/auth-guard"
import type { QuestionType } from "@prisma/client"

export async function getModulesWithQuizzes() {
  await requireTrainer()

  const modules = await prisma.module.findMany({
    orderBy: [{ track: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: {
      id: true,
      title: true,
      code: true,
      track: { select: { name: true } },
      quizzes: { select: { id: true } },
    },
  })

  return modules.map((m) => ({
    id: m.id,
    title: m.title,
    code: m.code,
    trackName: m.track.name,
    hasQuiz: m.quizzes.length > 0,
    quizId: m.quizzes[0]?.id ?? null,
  }))
}

export async function getQuizForEdit(moduleId: string) {
  await requireTrainer()

  let quiz = await prisma.quiz.findFirst({
    where: { moduleId },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  if (!quiz) {
    // Create a new quiz for this module
    quiz = await prisma.quiz.create({
      data: {
        moduleId,
        passingScore: 70,
      },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })
  }

  return {
    id: quiz.id,
    moduleId: quiz.moduleId,
    passingScore: quiz.passingScore,
    timeLimitMin: quiz.timeLimitMin,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options as string[],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      sortOrder: q.sortOrder,
    })),
  }
}

export async function updateQuizSettings(
  quizId: string,
  data: { passingScore: number; timeLimitMin: number | null }
) {
  await requireTrainer()

  await prisma.quiz.update({
    where: { id: quizId },
    data: {
      passingScore: data.passingScore,
      timeLimitMin: data.timeLimitMin,
    },
  })

  return { success: true }
}

export async function createQuestion(
  quizId: string,
  data: {
    question: string
    type: QuestionType
    options: string[]
    correctAnswer: string
    explanation: string | null
  }
) {
  await requireTrainer()

  const maxOrder = await prisma.quizQuestion.aggregate({
    where: { quizId },
    _max: { sortOrder: true },
  })

  const q = await prisma.quizQuestion.create({
    data: {
      quizId,
      question: data.question,
      type: data.type,
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  })

  return { id: q.id }
}

export async function updateQuestion(
  questionId: string,
  data: {
    question: string
    type: QuestionType
    options: string[]
    correctAnswer: string
    explanation: string | null
  }
) {
  await requireTrainer()

  await prisma.quizQuestion.update({
    where: { id: questionId },
    data: {
      question: data.question,
      type: data.type,
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
    },
  })

  return { success: true }
}

export async function deleteQuestion(questionId: string) {
  await requireTrainer()

  await prisma.quizQuestion.delete({
    where: { id: questionId },
  })

  return { success: true }
}

export async function reorderQuestions(quizId: string, questionIds: string[]) {
  await requireTrainer()

  await prisma.$transaction(
    questionIds.map((id, index) =>
      prisma.quizQuestion.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })
    )
  )

  return { success: true }
}

export async function getQuizStats(quizId: string) {
  await requireTrainer()

  const quiz = await prisma.quiz.findUniqueOrThrow({
    where: { id: quizId },
    include: {
      attempts: {
        select: {
          score: true,
          passed: true,
          answers: true,
        },
      },
      questions: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          question: true,
          correctAnswer: true,
          sortOrder: true,
        },
      },
    },
  })

  const totalAttempts = quiz.attempts.length
  const passedAttempts = quiz.attempts.filter((a) => a.passed).length
  const avgScore =
    totalAttempts > 0
      ? Math.round(
          quiz.attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
        )
      : 0
  const passRate =
    totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0

  // Per-question stats
  const questionStats = quiz.questions.map((q) => {
    let correct = 0
    let total = 0
    for (const attempt of quiz.attempts) {
      const answers = attempt.answers as Record<string, string>
      if (answers && answers[q.id] !== undefined) {
        total++
        if (answers[q.id] === q.correctAnswer) {
          correct++
        }
      }
    }
    return {
      id: q.id,
      question: q.question.substring(0, 80) + (q.question.length > 80 ? "..." : ""),
      sortOrder: q.sortOrder,
      correctPct: total > 0 ? Math.round((correct / total) * 100) : 0,
      totalAnswers: total,
    }
  })

  return {
    totalAttempts,
    passRate,
    avgScore,
    questionStats,
  }
}
