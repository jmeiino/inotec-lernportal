import { requireReviewer } from "@/lib/auth-guard"
import { getReviewQueue } from "@/lib/actions/submissions"
import { ReviewQueueClient } from "./review-client"

export default async function ReviewQueuePage() {
  const session = await requireReviewer()
  const isAdminOrTrainer = ["ADMIN", "TRAINER"].includes(session.user.role)
  const initial = await getReviewQueue({ status: "ALL" })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review-Queue</h1>
        <p className="text-muted-foreground mt-1">
          Arbeitsprodukt-Nachweise der Lernenden pruefen und freigeben.
        </p>
      </div>
      <ReviewQueueClient
        initialSubmissions={initial}
        canToggleScope={isAdminOrTrainer}
      />
    </div>
  )
}
