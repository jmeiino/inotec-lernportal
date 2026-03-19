"use client"

import { useState, useEffect, useTransition } from "react"
import { MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CommentItem } from "./comment-item"
import {
  getModuleComments,
  createComment,
  type CommentWithUser,
} from "@/lib/actions/comments"

interface CommentSectionProps {
  moduleId: string
  currentUserId: string
  currentUserRole: string
}

export function CommentSection({
  moduleId,
  currentUserId,
  currentUserRole,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [newComment, setNewComment] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)

  const loadComments = async () => {
    const data = await getModuleComments(moduleId)
    setComments(data)
    setIsLoading(false)
  }

  useEffect(() => {
    loadComments()
  }, [moduleId])

  const totalCount = comments.reduce(
    (count, c) => count + 1 + countReplies(c.replies),
    0
  )

  const handleSubmit = () => {
    if (!newComment.trim()) return
    startTransition(async () => {
      const result = await createComment(moduleId, newComment)
      if (result.success) {
        setNewComment("")
        await loadComments()
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Kommentare
          {totalCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({totalCount})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New comment form */}
        <div className="space-y-2">
          <Textarea
            placeholder="Kommentar schreiben..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isPending || !newComment.trim()}
              size="sm"
            >
              {isPending ? "Wird gesendet..." : "Kommentar senden"}
            </Button>
          </div>
        </div>

        {/* Comments list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Kommentare werden geladen...
          </p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Kommentare. Schreiben Sie den ersten!
          </p>
        ) : (
          <div className="divide-y">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                moduleId={moduleId}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function countReplies(replies: CommentWithUser[]): number {
  return replies.reduce(
    (count, r) => count + 1 + countReplies(r.replies),
    0
  )
}
