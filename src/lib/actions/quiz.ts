"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { QuestionType } from "@prisma/client"

// Types for quiz data sent to client (no correct answers!)
export type QuizQuestionClient = {
  id: string
  question: string
  options: unknown
  type: QuestionType
  sortOrder: number
}

export type QuizDataClient = {
  id: string
  moduleId: string
  moduleName: string
  trackId: string
  passingScore: number
  timeLimitMin: number | null
  questions: QuizQuestionClient[]
}

export type QuizResultQuestion = {
  id: string
  question: string
  options: unknown
  type: QuestionType
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation: string | null
}

export type QuizResult = {
  attemptId: string
  score: number
  passed: boolean
  passingScore: number
  totalQuestions: number
  correctCount: number
  questions: QuizResultQuestion[]
  trackCompleted: boolean
  trackId: string | null
  trackName: string | null
}

export type QuizAttemptSummary = {
  id: string
  score: number
  passed: boolean
  takenAt: Date
}

export async function getQuizForModule(
  moduleId: string
): Promise<{ data?: QuizDataClient; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { error: "Nicht authentifiziert." }
    }

    const quiz = await prisma.quiz.findFirst({
      where: { moduleId },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
        module: {
          select: { title: true, trackId: true },
        },
      },
    })

    if (!quiz) {
      return { error: "Kein Quiz fur dieses Modul gefunden." }
    }

    // Strip correct answers and explanations before sending to client
    const safeQuestions: QuizQuestionClient[] = quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      type: q.type,
      sortOrder: q.sortOrder,
    }))

    return {
      data: {
        id: quiz.id,
        moduleId: quiz.moduleId,
        moduleName: quiz.module.title,
        trackId: quiz.module.trackId,
        passingScore: quiz.passingScore,
        timeLimitMin: quiz.timeLimitMin,
        questions: safeQuestions,
      },
    }
  } catch (error) {
    console.error("Error loading quiz:", error)
    return { error: "Fehler beim Laden des Quiz." }
  }
}

export async function submitQuiz(
  quizId: string,
  answers: Record<string, string>
): Promise<{ data?: QuizResult; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { error: "Nicht authentifiziert." }
    }

    const userId = session.user.id

    // 1. Fetch quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        module: {
          select: {
            id: true,
            trackId: true,
            track: {
              select: {
                id: true,
                name: true,
                modules: { select: { id: true } },
              },
            },
          },
        },
      },
    })

    if (!quiz) {
      return { error: "Quiz nicht gefunden." }
    }

    // 2. Score each question
    let correctCount = 0
    const resultQuestions: QuizResultQuestion[] = quiz.questions.map((q) => {
      const userAnswer = answers[q.id] || ""
      let isCorrect = false

      switch (q.type) {
        case "SINGLE_CHOICE":
          isCorrect = userAnswer.trim() === q.correctAnswer.trim()
          break
        case "MULTI_CHOICE": {
          const userParts = userAnswer
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .sort()
            .join(",")
          const correctParts = q.correctAnswer
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .sort()
            .join(",")
          isCorrect = userParts === correctParts
          break
        }
        case "TRUE_FALSE":
          isCorrect =
            userAnswer.trim().toLowerCase() ===
            q.correctAnswer.trim().toLowerCase()
          break
        case "MATCHING":
          isCorrect = userAnswer.trim() === q.correctAnswer.trim()
          break
      }

      if (isCorrect) correctCount++

      return {
        id: q.id,
        question: q.question,
        options: q.options,
        type: q.type,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      }
    })

    // 3. Calculate score
    const totalQuestions = quiz.questions.length
    const score =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    const passed = score >= quiz.passingScore

    // 4. Save QuizAttempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        score,
        passed,
        answers: answers as object,
      },
    })

    let trackCompleted = false
    let trackId: string | null = null
    let trackName: string | null = null

    // 5. If passed, update progress
    if (passed) {
      // a. Update ModuleProgress to COMPLETED
      await prisma.moduleProgress.upsert({
        where: {
          userId_moduleId: {
            userId,
            moduleId: quiz.module.id,
          },
        },
        update: {
          status: "COMPLETED",
          progressPct: 100,
          completedAt: new Date(),
        },
        create: {
          userId,
          moduleId: quiz.module.id,
          status: "COMPLETED",
          progressPct: 100,
          completedAt: new Date(),
        },
      })

      // b. Check if all modules in track are completed
      const track = quiz.module.track
      const allModuleIds = track.modules.map((m) => m.id)

      const completedModules = await prisma.moduleProgress.count({
        where: {
          userId,
          moduleId: { in: allModuleIds },
          status: "COMPLETED",
        },
      })

      if (completedModules >= allModuleIds.length) {
        trackCompleted = true
        trackId = track.id
        trackName = track.name

        // c. Check if certificate already exists
        const existingCert = await prisma.certificate.findFirst({
          where: { userId, trackId: track.id },
        })

        // d. Create certificate if none exists
        if (!existingCert) {
          // Generate certificate number: CERT-{TRACK_LETTER}-{YEAR}-{NNNN}
          const trackLetter = track.name.charAt(0).toUpperCase()
          const year = new Date().getFullYear()

          // Count existing certificates this year
          const certCount = await prisma.certificate.count({
            where: {
              certNumber: {
                startsWith: `CERT-${trackLetter}-${year}-`,
              },
            },
          })

          const certNumber = `CERT-${trackLetter}-${year}-${String(
            certCount + 1
          ).padStart(4, "0")}`

          await prisma.certificate.create({
            data: {
              userId,
              trackId: track.id,
              certNumber,
            },
          })
        }

        // e. Update Enrollment status to COMPLETED
        await prisma.enrollment.updateMany({
          where: {
            userId,
            trackId: track.id,
            status: { not: "COMPLETED" },
          },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        })
      }
    }

    return {
      data: {
        attemptId: attempt.id,
        score,
        passed,
        passingScore: quiz.passingScore,
        totalQuestions,
        correctCount,
        questions: resultQuestions,
        trackCompleted,
        trackId,
        trackName,
      },
    }
  } catch (error) {
    console.error("Error submitting quiz:", error)
    return { error: "Fehler beim Absenden des Quiz." }
  }
}

export async function getQuizAttempts(
  quizId: string
): Promise<{ data?: QuizAttemptSummary[]; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { error: "Nicht authentifiziert." }
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: session.user.id, quizId },
      orderBy: { takenAt: "desc" },
      select: {
        id: true,
        score: true,
        passed: true,
        takenAt: true,
      },
    })

    return { data: attempts }
  } catch (error) {
    console.error("Error loading quiz attempts:", error)
    return { error: "Fehler beim Laden der Versuche." }
  }
}
