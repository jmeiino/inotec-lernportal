"use client"

import { useEffect, useState, useCallback } from "react"
import { Clock } from "lucide-react"

interface QuizTimerProps {
  timeLimitMin: number
  onTimeUp: () => void
}

export function QuizTimer({ timeLimitMin, onTimeUp }: QuizTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMin * 60)

  const handleTimeUp = useCallback(() => {
    onTimeUp()
  }, [onTimeUp])

  useEffect(() => {
    if (secondsLeft <= 0) {
      handleTimeUp()
      return
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft, handleTimeUp])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const isWarning = secondsLeft < 60
  const isCritical = secondsLeft < 30

  return (
    <div
      className={`flex items-center gap-2 font-mono text-lg font-bold ${
        isCritical
          ? "text-red-600 animate-pulse"
          : isWarning
          ? "text-orange-500"
          : "text-foreground"
      }`}
    >
      <Clock className="h-5 w-5" />
      <span>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  )
}
