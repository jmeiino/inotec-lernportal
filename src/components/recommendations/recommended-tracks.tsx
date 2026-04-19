import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ChevronRight } from "lucide-react"
import { formatCompetenceLevel } from "@/lib/utils"
import type { RecommendedTrack } from "@/lib/actions/recommendations"

export function RecommendedTracks({ items }: { items: RecommendedTrack[] }) {
  if (items.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Empfohlen fuer Sie
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2">
          {items.map((t) => (
            <Link
              key={t.id}
              href="/catalog"
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{t.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {formatCompetenceLevel(t.competenceLevel)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t.reason}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
