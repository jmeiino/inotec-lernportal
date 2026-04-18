"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

interface LoginFormProps {
  hasAzureAD: boolean
}

export function LoginForm({ hasAzureAD }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [showDevLogin, setShowDevLogin] = useState(!hasAzureAD)

  return (
    <>
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
          Mit INOTEC-Konto anmelden
        </button>
      )}

      {hasAzureAD && !showDevLogin && (
        <button
          onClick={() => setShowDevLogin(true)}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Stattdessen Entwicklungs-Login verwenden
        </button>
      )}

      {showDevLogin && (
        <>
          <div className="text-sm text-center text-muted-foreground bg-muted rounded-lg p-3">
            {hasAzureAD
              ? "Entwicklungs-Login (fuer Tests)"
              : "Entwicklungsmodus — Azure AD nicht konfiguriert"}
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
    </>
  )
}
