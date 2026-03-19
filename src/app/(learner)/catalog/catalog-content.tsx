"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  BookOpen,
  Clock,
  Users,
  ChevronRight,
  Check,
  Play,
  Monitor,
  MapPin,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { enrollInTrack } from "@/lib/actions/catalog"
import { toast } from "@/hooks/use-toast"

interface ModuleData {
  id: string
  code: string
  title: string
  description: string | null
  durationHours: number
  format: string
  sortOrder: number
  moduleStatus: string | null
  progressPct: number
}

interface TrackData {
  id: string
  name: string
  description: string | null
  level: string
  enrollmentStatus: string | null
  totalModules: number
  completedModules: number
  overallPct: number
  modules: ModuleData[]
}

const formatLabels: Record<string, { label: string; icon: typeof Monitor }> = {
  ONLINE: { label: "Online", icon: Monitor },
  PRESENCE: { label: "Präsenz", icon: MapPin },
  HYBRID: { label: "Hybrid", icon: Users },
}

function ModuleCard({ mod, enrolled }: { mod: ModuleData; enrolled: boolean }) {
  const formatInfo = formatLabels[mod.format] || formatLabels.ONLINE
  const FormatIcon = formatInfo.icon

  return (
    <Link href={`/modules/${mod.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="outline" className="text-xs shrink-0">
              {mod.code}
            </Badge>
            {enrolled && mod.moduleStatus === "COMPLETED" && (
              <Check className="h-4 w-4 text-green-500 shrink-0" />
            )}
            {enrolled && mod.moduleStatus === "IN_PROGRESS" && (
              <Play className="h-4 w-4 text-blue-500 shrink-0" />
            )}
          </div>
          <h4 className="font-medium text-sm leading-tight">{mod.title}</h4>
          {mod.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {mod.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {mod.durationHours}h
            </span>
            <span className="flex items-center gap-1">
              <FormatIcon className="h-3 w-3" />
              {formatInfo.label}
            </span>
          </div>
          {enrolled && mod.moduleStatus === "IN_PROGRESS" && (
            <Progress value={mod.progressPct} className="h-1.5" />
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function TrackSection({
  track,
  userId,
}: {
  track: TrackData
  userId: string
}) {
  const [isPending, startTransition] = useTransition()
  const enrolled = !!track.enrollmentStatus

  function handleEnroll() {
    startTransition(async () => {
      const result = await enrollInTrack(userId, track.id)
      if (result.success) {
        toast({ title: "Erfolgreich eingeschrieben!" })
      } else {
        toast({
          title: "Fehler",
          description: result.error,
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{track.name}</CardTitle>
              <Badge variant="secondary">{track.level}</Badge>
            </div>
            {track.description && (
              <p className="text-sm text-muted-foreground">
                {track.description}
              </p>
            )}
          </div>
          <div className="shrink-0">
            {enrolled ? (
              <div className="space-y-1 text-right">
                <div className="flex items-center gap-2">
                  <Progress value={track.overallPct} className="h-2 w-24" />
                  <span className="text-xs font-medium">{track.overallPct}%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {track.completedModules}/{track.totalModules} Module
                </p>
              </div>
            ) : (
              <Button onClick={handleEnroll} disabled={isPending} size="sm">
                {isPending ? "Wird eingeschrieben..." : "Einschreiben"}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {track.modules.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} enrolled={enrolled} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CatalogContent({
  tracks,
  userId,
}: {
  tracks: TrackData[]
  userId: string
}) {
  const [activeTab, setActiveTab] = useState("all")

  const filteredTracks =
    activeTab === "all"
      ? tracks
      : tracks.filter((t) => t.id === activeTab)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-4 flex-wrap h-auto gap-1">
        <TabsTrigger value="all">Alle</TabsTrigger>
        {tracks.map((track) => (
          <TabsTrigger key={track.id} value={track.id}>
            {track.name}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="space-y-6">
        {filteredTracks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Keine Lernpfade verfügbar.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTracks.map((track) => (
            <TrackSection key={track.id} track={track} userId={userId} />
          ))
        )}
      </div>
    </Tabs>
  )
}
