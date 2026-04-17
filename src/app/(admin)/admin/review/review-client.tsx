"use client"

import { useCallback, useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getReviewQueue,
  getSubmissionDetail,
  claimReview,
  approveSubmission,
  requestRework,
} from "@/lib/actions/submissions"
import { toast } from "@/hooks/use-toast"
import {
  formatCompetenceLevel,
  formatBusinessRole,
  formatSubmissionStatus,
  submissionStatusVariant,
} from "@/lib/utils"
import type { SubmissionStatus } from "@prisma/client"

type QueueItem = Awaited<ReturnType<typeof getReviewQueue>>[number]
type Detail = Awaited<ReturnType<typeof getSubmissionDetail>>

interface ReviewQueueClientProps {
  initialSubmissions: QueueItem[]
}

export function ReviewQueueClient({ initialSubmissions }: ReviewQueueClientProps) {
  const [items, setItems] = useState<QueueItem[]>(initialSubmissions)
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "ALL">("ALL")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [notes, setNotes] = useState("")
  const [isPending, startTransition] = useTransition()

  const refresh = useCallback(
    (nextFilter: SubmissionStatus | "ALL" = statusFilter) => {
      startTransition(async () => {
        const data = await getReviewQueue({ status: nextFilter })
        setItems(data)
      })
    },
    [statusFilter]
  )

  async function openDetail(id: string) {
    setSelectedId(id)
    setDetailLoading(true)
    try {
      const data = await getSubmissionDetail(id)
      setDetail(data)
      setNotes(data?.reviewNotes ?? "")
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setSelectedId(null)
    setDetail(null)
    setNotes("")
  }

  function handleClaim() {
    if (!selectedId) return
    startTransition(async () => {
      const res = await claimReview(selectedId)
      if (!res.success) {
        toast({ title: "Fehler", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Review uebernommen" })
      await openDetail(selectedId)
      refresh()
    })
  }

  function handleApprove() {
    if (!selectedId) return
    startTransition(async () => {
      const res = await approveSubmission(selectedId, notes)
      if (!res.success) {
        toast({ title: "Fehler", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Freigegeben" })
      closeDetail()
      refresh()
    })
  }

  function handleRework() {
    if (!selectedId) return
    if (!notes.trim()) {
      toast({
        title: "Notiz erforderlich",
        description: "Bitte begruenden Sie die Nacharbeit.",
        variant: "destructive",
      })
      return
    }
    startTransition(async () => {
      const res = await requestRework(selectedId, notes)
      if (!res.success) {
        toast({ title: "Fehler", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Zur Nacharbeit zurueckgegeben" })
      closeDetail()
      refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            const next = v as SubmissionStatus | "ALL"
            setStatusFilter(next)
            refresh(next)
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Offen (eingereicht + in Review)</SelectItem>
            <SelectItem value="SUBMITTED">Nur eingereicht</SelectItem>
            <SelectItem value="IN_REVIEW">Nur in Review</SelectItem>
            <SelectItem value="APPROVED">Freigegeben</SelectItem>
            <SelectItem value="REWORK">Nacharbeit</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {items.length} Einreichung{items.length === 1 ? "" : "en"}
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Lernende/r</TableHead>
              <TableHead>Modul</TableHead>
              <TableHead>Stufe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Eingereicht</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Keine Einreichungen gefunden.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => openDetail(s.id)}
                >
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="text-sm">{s.user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatBusinessRole(s.user.businessRole)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{s.module.code}</span>{" "}
                    {s.module.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {formatCompetenceLevel(s.module.competenceLevel)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={submissionStatusVariant(s.status)}>
                      {formatSubmissionStatus(s.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.reviewerName ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.submittedAt).toLocaleDateString("de-DE")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) closeDetail()
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailLoading
                ? "Laden..."
                : detail
                  ? detail.title
                  : "Einreichung"}
            </DialogTitle>
            <DialogDescription>
              {detail &&
                `${detail.user.name} · ${detail.module.code} · ${formatCompetenceLevel(detail.module.competenceLevel)}`}
            </DialogDescription>
          </DialogHeader>

          {detail && !detailLoading && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={submissionStatusVariant(detail.status)}>
                  {formatSubmissionStatus(detail.status)}
                </Badge>
                <Badge variant="outline">{detail.module.trackName}</Badge>
                <Badge variant="outline">
                  {formatBusinessRole(detail.user.businessRole)}
                </Badge>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold">Beschreibung</h4>
                <div className="whitespace-pre-wrap text-muted-foreground border rounded-lg p-3 bg-muted/30">
                  {detail.descriptionMd}
                </div>
              </div>

              {detail.externalUrl && (
                <div>
                  <a
                    href={detail.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs break-all"
                  >
                    {detail.externalUrl}
                  </a>
                </div>
              )}

              <div className="space-y-1">
                <h4 className="font-semibold">Reviewer-Notiz</h4>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Hinweise zur Freigabe oder Begruendung fuer Nacharbeit"
                  className="min-h-[100px]"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Eingereicht: {new Date(detail.submittedAt).toLocaleDateString("de-DE")}
                {detail.reviewer &&
                  ` · Aktuell zugewiesen: ${detail.reviewer.name}`}
                {detail.reviewedAt &&
                  ` · Geprueft: ${new Date(detail.reviewedAt).toLocaleDateString("de-DE")}`}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {detail && detail.status === "SUBMITTED" && (
              <Button
                variant="outline"
                onClick={handleClaim}
                disabled={isPending}
              >
                Review uebernehmen
              </Button>
            )}
            {detail &&
              (detail.status === "SUBMITTED" || detail.status === "IN_REVIEW") && (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleRework}
                    disabled={isPending}
                  >
                    Nacharbeit anfordern
                  </Button>
                  <Button onClick={handleApprove} disabled={isPending}>
                    Freigeben
                  </Button>
                </>
              )}
            {detail && detail.status === "APPROVED" && (
              <span className="text-sm text-muted-foreground">
                Bereits freigegeben.
              </span>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
