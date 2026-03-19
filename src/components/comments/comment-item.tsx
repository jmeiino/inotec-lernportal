"use client"

import { useState, useTransition } from "react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"
import { MessageSquare, CheckCircle, Trash2, Reply } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  createComment,
  toggleCommentResolved,
  deleteComment,
  type CommentWithUser,
} from "@/lib/actions/comments"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface CommentItemProps {
  comment: CommentWithUser
  moduleId: string
  currentUserId: string
  currentUserRole: string
  depth?: number
}

export function CommentItem({
  comment,
  moduleId,
  currentUserId,
  currentUserRole,
  depth = 0,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [isPending, startTransition] = useTransition()

  const isPrivileged = currentUserRole === "TRAINER" || currentUserRole === "ADMIN"
  const isOwner = comment.user.id === currentUserId
  const canDelete = isOwner || isPrivileged
  const maxDepth = 3

  const handleReply = () => {
    if (!replyContent.trim()) return
    startTransition(async () => {
      const result = await createComment(moduleId, replyContent, comment.id)
      if (result.success) {
        setReplyContent("")
        setShowReplyForm(false)
      }
    })
  }

  const handleToggleResolved = () => {
    startTransition(async () => {
      await toggleCommentResolved(comment.id)
    })
  }

  const handleDelete = () => {
    if (!confirm("Kommentar wirklich loeschen?")) return
    startTransition(async () => {
      await deleteComment(comment.id)
    })
  }

  const roleBadge =
    comment.user.role === "ADMIN" ? (
      <Badge variant="default" className="text-[10px] px-1.5 py-0">
        Admin
      </Badge>
    ) : comment.user.role === "TRAINER" ? (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        Trainer
      </Badge>
    ) : null

  return (
    <div className={depth > 0 ? "ml-6 md:ml-10 border-l-2 border-muted pl-4" : ""}>
      <div className="flex gap-3 py-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs">
            {getInitials(comment.user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{comment.user.name}</span>
            {roleBadge}
            {comment.resolved && (
              <Badge variant="success" className="text-[10px] px-1.5 py-0 gap-0.5">
                <CheckCircle className="h-3 w-3" />
                Beantwortet
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              vor {formatDistanceToNow(new Date(comment.createdAt), { locale: de })}
            </span>
          </div>

          <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>

          <div className="flex items-center gap-2 flex-wrap">
            {depth < maxDepth && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <Reply className="h-3 w-3" />
                Antworten
              </Button>
            )}

            {isPrivileged && !comment.parentId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={handleToggleResolved}
                disabled={isPending}
              >
                <CheckCircle className="h-3 w-3" />
                {comment.resolved ? "Als offen markieren" : "Als beantwortet markieren"}
              </Button>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-3 w-3" />
                Loeschen
              </Button>
            )}
          </div>

          {showReplyForm && (
            <div className="mt-2 space-y-2">
              <Textarea
                placeholder="Antwort schreiben..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={isPending || !replyContent.trim()}
                >
                  {isPending ? "Wird gesendet..." : "Antworten"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowReplyForm(false)
                    setReplyContent("")
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              moduleId={moduleId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
