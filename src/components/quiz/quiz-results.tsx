"use client"

import type { QuizResult } from "@/lib/actions/quiz"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, XCircle, Award, ArrowLeft, RotateCcw } from "lucide-react"
import Link from "next/link"

interface QuizResultsProps {
  result: QuizResult
  moduleId: string
  onRetry: () => void
}

type OptionItem = { key: string; text: string }

function parseOptions(options: unknown): OptionItem[] {
  if (Array.isArray(options)) {
    return options.map((opt, i) => {
      if (typeof opt === "object" && opt !== null && "key" in opt && "text" in opt) {
        return { key: String((opt as { key: string }).key), text: String((opt as { text: string }).text) }
      }
      return { key: String.fromCharCode(65 + i), text: String(opt) }
    })
  }
  if (typeof options === "object" && options !== null) {
    return Object.entries(options as Record<string, string>).map(([key, text]) => ({
      key,
      text: String(text),
    }))
  }
  return []
}

function getOptionText(options: unknown, key: string): string {
  const parsed = parseOptions(options)
  const found = parsed.find((o) => o.key === key)
  return found ? `${found.key}: ${found.text}` : key
}

function formatAnswer(answer: string, options: unknown, type: string): string {
  if (!answer) return "Nicht beantwortet"
  if (type === "TRUE_FALSE") return answer === "true" ? "Richtig" : "Falsch"
  if (type === "MULTI_CHOICE") {
    return answer
      .split(",")
      .map((k) => getOptionText(options, k.trim()))
      .join(", ")
  }
  return getOptionText(options, answer)
}

export function QuizResults({ result, moduleId, onRetry }: QuizResultsProps) {
  return (
    <div className="space-y-8">
      {/* Score Overview */}
      <Card
        className={
          result.passed
            ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
            : "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
        }
      >
        <CardContent className="p-8 text-center space-y-4">
          {result.passed ? (
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          ) : (
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          )}

          <h2 className="text-2xl font-bold">
            {result.passed ? "Bestanden!" : "Leider nicht bestanden"}
          </h2>

          <div className="text-5xl font-bold">
            <span
              className={result.passed ? "text-green-600" : "text-red-600"}
            >
              {result.score}%
            </span>
          </div>

          <Progress
            value={result.score}
            className={`h-3 max-w-md mx-auto ${
              result.passed ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500"
            }`}
          />

          <p className="text-muted-foreground">
            {result.correctCount} von {result.totalQuestions} Fragen richtig
            beantwortet (Mindestpunktzahl: {result.passingScore}%)
          </p>

          {result.trackCompleted && (
            <div className="mt-6 p-4 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-bold text-green-700 dark:text-green-300">
                  Herzlichen Gluckwunsch!
                </h3>
              </div>
              <p className="text-green-700 dark:text-green-300">
                Sie haben den Track &quot;{result.trackName}&quot; erfolgreich
                abgeschlossen.
              </p>
              <Link href="/certificates">
                <Button variant="outline" className="mt-3">
                  <Award className="h-4 w-4 mr-2" />
                  Zu meinen Zertifikaten
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Review */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Auswertung</h3>

        {result.questions.map((q, index) => (
          <Card
            key={q.id}
            className={
              q.isCorrect
                ? "border-green-200 dark:border-green-800"
                : "border-red-200 dark:border-red-800"
            }
          >
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {q.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Frage {index + 1}
                    </span>
                    <Badge
                      variant={q.isCorrect ? "success" : "destructive"}
                    >
                      {q.isCorrect ? "Richtig" : "Falsch"}
                    </Badge>
                  </div>
                  <p className="font-medium">{q.question}</p>

                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">
                        Ihre Antwort:{" "}
                      </span>
                      <span
                        className={
                          q.isCorrect
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium line-through"
                        }
                      >
                        {formatAnswer(q.userAnswer, q.options, q.type)}
                      </span>
                    </p>
                    {!q.isCorrect && (
                      <p>
                        <span className="text-muted-foreground">
                          Richtige Antwort:{" "}
                        </span>
                        <span className="text-green-600 font-medium">
                          {formatAnswer(
                            q.correctAnswer,
                            q.options,
                            q.type
                          )}
                        </span>
                      </p>
                    )}
                  </div>

                  {q.explanation && (
                    <div className="mt-2 p-3 rounded bg-muted/50 text-sm">
                      <span className="font-medium">Erklarung: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Link href={`/modules/${moduleId}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zuruck zum Modul
          </Button>
        </Link>
        {!result.passed && (
          <Button onClick={onRetry}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        )}
      </div>
    </div>
  )
}
