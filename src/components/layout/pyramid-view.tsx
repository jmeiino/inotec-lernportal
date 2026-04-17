"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Check, Play, Lock, Trophy } from "lucide-react"
import { cn, formatCompetenceLevel } from "@/lib/utils"
import type { PyramidData, PyramidLevelData } from "@/lib/actions/learner"

const LEVEL_WIDTH: Record<string, string> = {
  L1: "w-full",
  L2: "w-[82%]",
  L3: "w-[64%]",
  L4: "w-[46%]",
  F1: "w-full",
  F2: "w-[72%]",
  F3: "w-[48%]",
}

function statusInfo(level: PyramidLevelData) {
  if (level.totalTracks === 0) {
    return {
      icon: Lock,
      iconClass: "text-muted-foreground",
      tone: "bg-muted/40 border-muted",
      label: "keine Inhalte",
    }
  }
  if (level.totalModules > 0 && level.completedModules === level.totalModules) {
    return {
      icon: Trophy,
      iconClass: "text-amber-500",
      tone: "bg-amber-500/10 border-amber-500/40",
      label: "abgeschlossen",
    }
  }
  if (level.progressPct > 0) {
    return {
      icon: Play,
      iconClass: "text-blue-500",
      tone: "bg-blue-500/5 border-blue-500/30",
      label: "in Bearbeitung",
    }
  }
  if (level.enrolledTracks > 0) {
    return {
      icon: Play,
      iconClass: "text-blue-400",
      tone: "bg-blue-400/5 border-blue-400/20",
      label: "eingeschrieben",
    }
  }
  return {
    icon: Check,
    iconClass: "text-muted-foreground",
    tone: "bg-card border-border",
    label: "offen",
  }
}

function LevelRow({ level }: { level: PyramidLevelData }) {
  const info = statusInfo(level)
  const Icon = info.icon
  const widthClass = LEVEL_WIDTH[level.level] ?? "w-full"

  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "relative rounded-lg border px-4 py-3 transition-colors",
          info.tone,
          widthClass
        )}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Icon className={cn("h-5 w-5", info.iconClass)} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {formatCompetenceLevel(level.level)}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {info.label}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                {level.completedModules}/{level.totalModules} Module
              </span>
            </div>
            {level.totalModules > 0 && (
              <Progress value={level.progressPct} className="h-1.5" />
            )}
            {level.tracks.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {level.tracks.map((t) => (
                  <Link
                    key={t.id}
                    href="/catalog"
                    className="text-[11px] px-2 py-0.5 rounded-full border hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{t.name}</span>
                    {t.enrolled ? (
                      <span className="ml-1 text-muted-foreground">
                        {t.progressPct}%
                      </span>
                    ) : (
                      <span className="ml-1 text-muted-foreground">neu</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PyramidView({
  data,
  title,
  description,
}: {
  data: PyramidData
  title: string
  description?: string
}) {
  const topDown = [...data.levels].reverse()
  const hasAnyTracks = data.levels.some((l) => l.totalTracks > 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {hasAnyTracks ? (
          <div className="space-y-2">
            {topDown.map((lvl) => (
              <LevelRow key={lvl.level} level={lvl} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Noch keine Inhalte fuer diese Pyramide verfuegbar.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
