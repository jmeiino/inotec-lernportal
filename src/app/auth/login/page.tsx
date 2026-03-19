"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const hasAzureAD = !!process.env.NEXT_PUBLIC_HAS_AZURE_AD

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">INOTEC</h1>
          <h2 className="text-xl font-semibold mt-2">Lernportal</h2>
          <p className="text-muted-foreground mt-2">
            Internes Schulungsportal für KI &amp; Digitalisierung
          </p>
        </div>

        <div className="bg-card rounded-xl shadow-lg border p-6 space-y-6">
          {hasAzureAD && (
            <button
              onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#0078d4] text-white rounded-lg hover:bg-[#106ebe] transition-colors font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 21 21">
                <path fill="#f25022" d="M1 1h9v9H1z" />
                <path fill="#00a4ef" d="M1 11h9v9H1z" />
                <path fill="#7fba00" d="M11 1h9v9h-9z" />
                <path fill="#ffb900" d="M11 11h9v9h-9z" />
              </svg>
              Mit Microsoft anmelden
            </button>
          )}

          {!hasAzureAD && (
            <>
              <div className="text-sm text-center text-muted-foreground bg-muted rounded-lg p-3">
                Entwicklungsmodus — Azure AD nicht konfiguriert
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@inotec.local"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <button
                  onClick={() =>
                    signIn("credentials", {
                      email,
                      name,
                      callbackUrl: "/dashboard",
                    })
                  }
                  className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Anmelden
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
