"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getQuizForModule,
  submitQuiz,
  type QuizDataClient,
  type QuizResult,
} from "@/lib/actions/quiz"
import { QuestionDisplay } from "./question-display"
import { QuizResults } from "./quiz-results"
import { QuizTimer } from "./quiz-timer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  AlertCircle,
  FileQuestion,
} from "lucide-react"

interface QuizClientProps {
  moduleId: string
}

export function QuizClient({ moduleId }: QuizClientProps) {
  const [quiz, setQuiz] = useState<QuizDataClient | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const submittedRef = useRef(false)

  useEffect(() => {
    async function load() {
      const res = await getQuizForModule(moduleId)
      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        setQuiz(res.data)
      }
      setLoading(false)
    }
    load()
  }, [moduleId])

  const answeredCount = quiz
    ? quiz.questions.filter((q) => answers[q.id] && answers[q.id].length > 0)
        .length
    : 0

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!quiz) return
      const questionId = quiz.questions[currentQuestion].id
      setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    },
    [quiz, currentQuestion]
  )

  const handleSubmit = useCallback(async () => {
    if (!quiz || submittedRef.current) return
    submittedRef.current = true
    setShowConfirmDialog(false)
    setSubmitting(true)

    const res = await submitQuiz(quiz.id, answers)
    if (res.error) {
      setError(res.error)
      submittedRef.current = false
    } else if (res.data) {
      setResult(res.data)
    }
    setSubmitting(false)
  }, [quiz, answers])

  const handleTimeUp = useCallback(() => {
    if (!submittedRef.current) {
      handleSubmit()
    }
  }, [handleSubmit])

  const handleRetry = useCallback(() => {
    setResult(null)
    setAnswers({})
    setCurrentQuestion(0)
    submittedRef.current = false
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Quiz wird geladen...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardContent className="p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Zuruck
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!quiz) return null

  // Show results if submitted
  if (result) {
    return (
      <QuizResults result={result} moduleId={moduleId} onRetry={handleRetry} />
    )
  }

  const currentQ = quiz.questions[currentQuestion]
  const progressPct =
    quiz.questions.length > 0
      ? Math.round((answeredCount / quiz.questions.length) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl">{quiz.moduleName}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {quiz.questions.length} Fragen &middot; Mindestpunktzahl:{" "}
                {quiz.passingScore}%
              </p>
            </div>
            {quiz.timeLimitMin && (
              <QuizTimer
                timeLimitMin={quiz.timeLimitMin}
                onTimeUp={handleTimeUp}
              />
            )}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Fortschritt</span>
              <span className="font-medium">
                {answeredCount} / {quiz.questions.length} beantwortet
              </span>
            </div>
            <Progress value={progressPct} />
          </div>
        </CardHeader>
      </Card>

      {/* Question Navigation */}
      <div className="flex flex-wrap gap-2">
        {quiz.questions.map((q, index) => {
          const isAnswered = !!answers[q.id] && answers[q.id].length > 0
          const isCurrent = index === currentQuestion
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentQuestion(index)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                isCurrent
                  ? "bg-primary text-primary-foreground shadow-md"
                  : isAnswered
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>

      {/* Current Question */}
      <Card>
        <CardContent className="p-6">
          <QuestionDisplay
            question={currentQ}
            questionIndex={currentQuestion}
            totalQuestions={quiz.questions.length}
            answer={answers[currentQ.id] || ""}
            onAnswer={handleAnswer}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={currentQuestion === 0}
          onClick={() => setCurrentQuestion((prev) => prev - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Zuruck
        </Button>

        <div className="flex gap-2">
          {currentQuestion < quiz.questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion((prev) => prev + 1)}
            >
              Weiter
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird ausgewertet...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Quiz abgeben
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Submit Button (always visible) */}
      {currentQuestion < quiz.questions.length - 1 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setShowConfirmDialog(true)}
            disabled={submitting}
            size="sm"
          >
            <FileQuestion className="h-4 w-4 mr-2" />
            Quiz vorzeitig abgeben
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quiz abgeben?</DialogTitle>
            <DialogDescription>
              Sind Sie sicher? Sie haben {answeredCount} von{" "}
              {quiz.questions.length} Fragen beantwortet.
              {answeredCount < quiz.questions.length && (
                <span className="block mt-2 text-orange-500 font-medium">
                  Achtung: {quiz.questions.length - answeredCount} Fragen sind
                  noch nicht beantwortet!
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Ja, abgeben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
