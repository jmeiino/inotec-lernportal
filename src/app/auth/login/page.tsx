import { isAzureADEnabled } from "@/lib/auth"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">INOTEC</h1>
          <h2 className="text-xl font-semibold mt-2">Lernportal</h2>
          <p className="text-muted-foreground mt-2">
            Internes Schulungsportal fuer KI &amp; Digitalisierung
          </p>
        </div>

        <div className="bg-card rounded-xl shadow-lg border p-6 space-y-6">
          <LoginForm hasAzureAD={isAzureADEnabled} />
        </div>
      </div>
    </div>
  )
}
