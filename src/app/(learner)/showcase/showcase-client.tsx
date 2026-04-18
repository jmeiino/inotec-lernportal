"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listShowcase, likeShowcase } from "@/lib/actions/showcase"
import {
  formatBusinessRole,
  formatCompetenceLevel,
} from "@/lib/utils"
import { Heart, ExternalLink, Sparkles } from "lucide-react"
import type { BusinessRole, CompetenceLevel } from "@prisma/client"

type ShowcaseData = Awaited<ReturnType<typeof listShowcase>>
type Item = ShowcaseData["items"][number]

const BUSINESS_ROLES: BusinessRole[] = [
  "VERTRIEB", "PRODUKTION", "VERWALTUNG", "IT", "HR", "FUEHRUNG",
]
const LEVELS: CompetenceLevel[] = ["L1", "L2", "L3", "L4", "F1", "F2", "F3"]

export function ShowcaseClient({ initial }: { initial: ShowcaseData }) {
  const [items, setItems] = useState(initial.items)
  const [tags, setTags] = useState(initial.availableTags)
  const [role, setRole] = useState<BusinessRole | "ALL">("ALL")
  const [level, setLevel] = useState<CompetenceLevel | "ALL">("ALL")
  const [tag, setTag] = useState<string>("ALL")
  const [isPending, startTransition] = useTransition()

  function applyFilters(
    nextRole = role,
    nextLevel = level,
    nextTag = tag
  ) {
    startTransition(async () => {
      const data = await listShowcase({
        businessRole: nextRole,
        competenceLevel: nextLevel,
        tag: nextTag === "ALL" ? undefined : nextTag,
      })
      setItems(data.items)
      setTags(data.availableTags)
    })
  }

  function handleLike(id: string) {
    startTransition(async () => {
      const res = await likeShowcase(id)
      if (res.success && typeof res.likes === "number") {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, likes: res.likes as number } : i))
        )
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={role}
          onValueChange={(v) => {
            const next = v as BusinessRole | "ALL"
            setRole(next)
            applyFilters(next, level, tag)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Rolle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Rollen</SelectItem>
            {BUSINESS_ROLES.map((b) => (
              <SelectItem key={b} value={b}>
                {formatBusinessRole(b)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={level}
          onValueChange={(v) => {
            const next = v as CompetenceLevel | "ALL"
            setLevel(next)
            applyFilters(role, next, tag)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Stufe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Stufen</SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {formatCompetenceLevel(l)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tags.length > 0 && (
          <Select
            value={tag}
            onValueChange={(v) => {
              setTag(v)
              applyFilters(role, level, v)
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alle Tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="text-sm text-muted-foreground">{items.length} Eintraege</span>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">
              Noch keine Showcase-Eintraege fuer diese Filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <ShowcaseCard key={it.id} item={it} onLike={handleLike} busy={isPending} />
          ))}
        </div>
      )}
    </div>
  )
}

function ShowcaseCard({
  item,
  onLike,
  busy,
}: {
  item: Item
  onLike: (id: string) => void
  busy: boolean
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{item.title}</CardTitle>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline" className="text-[10px]">
            {item.module.code}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {formatCompetenceLevel(item.module.competenceLevel)}
          </Badge>
          {item.author.businessRole && (
            <Badge variant="outline" className="text-[10px]">
              {formatBusinessRole(item.author.businessRole)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <p className="text-sm whitespace-pre-wrap text-muted-foreground line-clamp-6">
          {item.descriptionMd}
        </p>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                #{t}
              </Badge>
            ))}
          </div>
        )}
        {item.externalUrl && (
          <a
            href={item.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Externer Link
          </a>
        )}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <span>
            {item.author.name}
            {item.author.department && ` · ${item.author.department}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1"
            disabled={busy}
            onClick={() => onLike(item.id)}
          >
            <Heart className="h-3.5 w-3.5" />
            {item.likes}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
