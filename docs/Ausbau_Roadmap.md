# Ausbau-Roadmap Lernportal (Phasen 6+)

Stand: 2026-04-18. Basis: Schulungskonzept_INOTEC.md und aktuelle Implementierung
nach Phase 1–5.

Jede Phase liefert einen in sich abgeschlossenen Commit, wird gegen `main` gepusht
und enthält Build-Check + Seed-Update falls relevant.

| Phase | Thema | Prio | Aufwand |
|---|---|---|---|
| 6 | Puls-Feedback nach Modul-Abschluss | hoch | S |
| 7 | Showcase-/Use-Case-Bibliothek | hoch | M |
| 8 | Team-Sicht für Führungskräfte | hoch | M |
| 9 | Rhythmus-Event-Typen (Stammtisch, Showcase, Strategic Review, L3) | mittel | M |
| 10 | Notification-System (In-App + SMTP) | mittel | M |
| 11 | Admin-KPI-Dashboard erweitern | mittel | S |
| 12 | Entra ID / SSO aktivieren | mittel | S |
| 13 | Impact-Stories als Content-Typ | niedrig | S |
| 14 | Multiplikator-Jahresbestätigung | niedrig | S |
| 15 | Audit-Log | niedrig | M |
| 16 | CSV-Import / Reporting (Jahresgespräch) | niedrig | M |
| 17 | Empfohlene Lernpfade nach BusinessRole | niedrig | S |
| 18 | Prompt-Bibliothek pro BusinessRole | niedrig | M |
| 19 | Review-Scoping (Multiplikator nur eigene Abteilung) | niedrig | S |
| 20 | F3-Steuerkreis-Dashboard | niedrig | M |

Aufwand: S = ½–1 Tag, M = 1–3 Tage, L = >3 Tage.

---

## Phase 6 — Puls-Feedback nach Modul-Abschluss

**Ziel:** Drei-Fragen-Feedback direkt beim Abschluss eines Moduls, aggregiert als
Qualitätsindikator pro Modul.

**Schema:**
- `ModuleFeedback(id, userId, moduleId, relevance INT, quality INT,
  openText String?, submittedAt, @@unique userId+moduleId)`

**Server Actions** (`lib/actions/feedback.ts`):
- `submitModuleFeedback`
- `getModuleFeedbackStats(moduleId)` — Ø Relevance, Ø Quality, N
- `getFeedbackLowPerformers` für Admin-Dashboard

**UI:**
- Bei `status === COMPLETED` auf Modul-Detail: Dialog-Prompt „Kurz-Feedback?"
- Admin-Modul-Detail zeigt Ø Relevance / Quality + Freitext-Wolke

**Abhängigkeiten:** keine. Muss vor Phase 11 kommen (Dashboard zeigt Kennzahlen).

---

## Phase 7 — Showcase- / Use-Case-Bibliothek

**Ziel:** Approved `WorkProductSubmission` werden sichtbar und inspirativ für
andere Mitarbeitende. Erfüllt § 3.4.

**Schema-Delta:**
- `WorkProductSubmission.published Boolean @default(false)`
- `WorkProductSubmission.tags String[]`
- `WorkProductSubmission.likes Int @default(0)`

**Server Actions** (`showcase.ts`):
- `publishSubmission(id, publish: boolean)` (Admin / Autor-Opt-In)
- `listShowcase(filters: { businessRole?, competenceLevel?, tag? })`
- `likeShowcase(id)`

**UI:**
- Neue Route `/showcase` (Learner) — Galerie mit Filter
- Reviewer-UI bekommt „Veröffentlichen?"-Checkbox bei Approve
- Autor kann eigene Einreichungen nachträglich veröffentlichen

**Abhängigkeiten:** Phase 3 (Submissions).

---

## Phase 8 — Team-Sicht für Führungskräfte

**Ziel:** FK sieht Pyramide der direkt unterstellten Mitarbeiter, offene WPs,
ausstehende L1/F1-Pflichtabschlüsse.

**Schema-Delta:**
- `User.managerId String?` mit self-relation
- `User.reports User[] @relation("ManagerReports")`

**Server Actions** (`team.ts`):
- `getMyTeamOverview()` — Aggregation pro Direct-Report
- `getTeamPyramids()` — analog Learner-Dashboard, aber für Team

**UI:**
- Neue Route `/my-team` sichtbar für User mit `reports.length > 0`
- Admin-UI: Dropdown „Manager" im User-Detail

**Abhängigkeiten:** Phase 1 (User-Model).

---

## Phase 9 — Rhythmus-Event-Typen

**Ziel:** Stammtisch, Showcase, Strategic Review, L3-Community als
strukturierte Termine (nicht nur Ad-hoc-Schedules).

**Schema-Delta:**
- `Schedule.eventType EventType` (Enum: KURS, STAMMTISCH, SHOWCASE,
  STRATEGIC_REVIEW, L3_COMMUNITY)
- `Schedule.moduleId String?` wird nullable (reiner Event ohne Modulbezug)
- `Schedule.targetAudience Json?` (Rollen-Filter für Einladungen)

**Server Actions:**
- `listEventsByType(type, range)`
- `listMyRelevantEvents(userId)` (basierend auf Role + BusinessRole)

**UI:**
- Neue Route `/events` mit Tabs pro Typ, iCal-Feed pro Typ
- Admin-Kalender erweitert um Event-Typ-Filter
- Lerner-Sidebar: „Events" statt nur „Präsenztermine"

**Abhängigkeiten:** bestehendes `Schedule`-Modell.

---

## Phase 10 — Notification-System

**Ziel:** Zeitnahe Benachrichtigung, damit Flows nicht verwaisen.

**Schema:**
- `Notification(id, userId, type, title, bodyMd, linkUrl?, readAt?, createdAt)`
- Enum `NotificationType`: WP_SUBMITTED, WP_APPROVED, WP_REWORK,
  MULTIPLIER_RENEWAL_DUE, SURVEY_ACTIVE, EVENT_REGISTERED

**Trigger-Stellen:**
- `createSubmission` → Reviewer-Pool der Abteilung
- `approveSubmission` / `requestRework` → Autor
- Cron-Job für MULTIPLIER_RENEWAL_DUE (90 Tage vor Ablauf)

**UI:**
- Bell-Icon in Sidebar mit Unread-Badge
- `/notifications` Liste + Mark-as-read

**SMTP (optional, flag-gesteuert):**
- Env `SMTP_HOST / SMTP_USER / SMTP_PASS`
- Nodemailer-Integration, Template pro Typ
- User-Präferenz `User.emailNotifications Boolean @default(true)`

**Abhängigkeiten:** Phase 3 (Submissions), nice-to-have: Phase 14.

---

## Phase 11 — Admin-KPI-Dashboard erweitern

**Ziel:** Ein Blick genügt, um Zustand des Schulungssystems zu erfassen.

**Neue Kennzahlen auf `/admin`:**
- Submission-Durchlaufzeit (Ø Tage von SUBMITTED zu APPROVED/REWORK)
- Reviewer-Auslastung (offene WPs pro Reviewer)
- Survey-Teilnahme (Response-Rate je aktiver Survey)
- **Transferlücke**: Δ zwischen Selbsteinschätzung-Ø und Tool-Usage-Nutzer-Quote
  je Abteilung — der interessanteste Datenpunkt nach § 7.5

**Server Actions:** Ergänzung zu `getAdminDashboard`.

**Abhängigkeiten:** Phasen 4, 5, 6 vorhanden (Datenquellen).

---

## Phase 12 — Entra ID / SSO

**Ziel:** Manuelle User-Anlage ersetzen.

**Arbeit:**
- NextAuth Azure-AD-Provider aktivieren (Env-Variablen sind schon reserviert)
- Callback-Handler: `user.businessRole` leer lassen, Admin setzt manuell
- `signIn` mapped `department` aus Azure-Group-Claim, falls vorhanden
- Login-Seite: Button „Anmelden mit INOTEC-Konto"

**UI-Impact:** klein. Bestehende Credentials-Provider bleibt für Tests.

**Abhängigkeiten:** Azure-Side muss App-Registrierung + Secrets bereitstellen.

---

## Phase 13 — Impact-Stories

**Ziel:** Erfolgs-Storytelling als eigenes Format neben WPs.

**Schema:**
- `ImpactStory(id, authorId, title, problem, solution, metric, tags,
  publishedAt?, createdAt)`

**UI:**
- Route `/impact` mit Karten-Layout
- Einreich-Formular ähnlich WP, aber öffentlich per Default
- Dashboard-Widget „Impact des Monats"

**Abhängigkeiten:** keine. Synergie mit Phase 7.

---

## Phase 14 — Multiplikator-Jahresbestätigung

**Ziel:** § 3.4 „Status Multiplikator wird jährlich bestätigt".

**Schema:**
- `RoleAssignment(id, userId, role MULTIPLICATOR|CHAMPION, businessRole?,
  validFrom, validUntil, approvedById)`

**Logik:**
- Ablauf `validUntil` setzt `User.role` zurück auf LEARNER (Cron)
- Renewal-Workflow: Admin bekommt Task 30 Tage vor Ablauf

**UI:**
- Admin-Seite `/admin/role-assignments` mit Ablauf-Übersicht
- Ein-Klick-Erneuerung (validUntil +12 Monate)

**Abhängigkeiten:** Phase 10 (Notification für Reminder).

---

## Phase 15 — Audit-Log

**Ziel:** Nachvollziehbarkeit aller sicherheits- und compliance-relevanten
Admin-Aktionen.

**Schema:**
- `AuditLog(id, actorId, action, targetType, targetId, beforeJson?,
  afterJson?, createdAt)`
- Actions: ROLE_CHANGE, TOOL_ACCESS_CHANGE, WP_APPROVED, WP_REWORK,
  SURVEY_CREATED, SURVEY_DEACTIVATED, USER_BUSINESS_ROLE_CHANGE

**Umsetzung:**
- Helper `writeAudit(...)` in alle relevanten Server Actions integrieren
- Admin-Route `/admin/audit` mit Filter nach Actor / Action / Target

**Abhängigkeiten:** keine.

---

## Phase 16 — CSV-Import / Reporting

**Ziel:** Bulk-Anlage und Jahresgespräch-Export.

**Server Actions:**
- `importUsersCsv(file)` — Validierung + Preview + Apply
- `exportYearlyReport(userId)` — PDF/CSV mit Stufen, WPs, Zertifikaten,
  Tool-Nutzung

**UI:**
- Admin-Seite `/admin/import` mit Drag&Drop
- User-Detail: „Jahresgespräch-Export" Button

**Abhängigkeiten:** alle vorherigen Phasen (Datenmaterial).

---

## Phase 17 — Empfohlene Lernpfade

**Ziel:** „Für dich empfohlen" im Katalog.

**Logik:**
- Basierend auf `User.businessRole` und aktuellen Self-Assessment-Daten
- Regel-basiert: „Falls L1 nicht abgeschlossen → L1 zuerst", „Falls
  businessRole=VERTRIEB → C-Tracks aus".

**UI:**
- Dashboard-Widget „Empfohlen für Sie"
- Katalog-Sortierung: „Empfohlen" als Default

**Abhängigkeiten:** Phase 1 (BusinessRole), Phase 4 (Self-Assessment).

---

## Phase 18 — Prompt-Bibliothek

**Ziel:** § 3.4 „Aufbau und Pflege von Prompt-/Workflow-Bibliotheken".

**Schema:**
- `PromptTemplate(id, authorId, title, body, businessRole?, tags, tool,
  createdAt, updatedAt)`

**UI:**
- Route `/prompts` mit Filter nach BusinessRole / Tool
- „Copy to clipboard" pro Prompt
- Multiplikatoren können erstellen/bearbeiten, Lerner lesen und kopieren
- Auto-Vorschlag: aus APPROVED-WPs extrahierbar (Button beim Reviewen)

**Abhängigkeiten:** Phasen 3, 5 (Tools).

---

## Phase 19 — Review-Scoping

**Ziel:** Multiplikator sieht nur relevante Einreichungen.

**Regel:** Multiplikator mit `businessRole=X` sieht per Default nur WPs von
Usern mit `businessRole=X` und vom selben `department`. Admins/Trainer sehen
alles.

**Änderung:**
- `getReviewQueue` filter logic um userBusinessRole + userDepartment
- Toggle im UI „Alle anzeigen" für Admin/Trainer

**Abhängigkeiten:** Phase 3.

---

## Phase 20 — F3-Steuerkreis-Dashboard

**Ziel:** Halbjährliche strategische Review mit einem Blick (§ 6.3).

**Inhalt:**
- Big-Picture Pyramide über alle Abteilungen
- Transferlücke aus Phase 11 als Heatmap
- Submission-Durchlaufzeit-Trend
- Offene Entscheidungen aus vergangenen F3-Reviews als Content

**Schema-Delta:**
- `StrategicReviewDecision(id, reviewDate, topic, decision, owner,
  dueDate, status)`

**Rolle:** Neue Rolle `EXEC` oder `BOARD` oder Filter auf Role=CHAMPION+Admin.
Detail bei Implementierung entscheiden.

**Abhängigkeiten:** Phasen 10, 11.

---

## Umsetzungs-Leitlinien

- **Commit-Konvention:** `feat(phase<N>): <kurz>` in Imperativ, wie bisher
- **Vor jedem Push:** `npx tsc --noEmit` + `npm run build` grün
- **Schema-Migration:** `npx prisma db push` (Dev) reicht, solange keine
  Prod-DB berührt ist; sonst Migrations-Files generieren
- **Seed:** bei struktureller Erweiterung um ein sinnvolles Beispiel-Element
  ergänzen, damit die neue Funktion sofort sichtbar ist
- **Docker-Neubau:** nach Schema- oder App-Code-Änderungen
  `docker compose build app && docker compose up -d app`
- **Dokumentation:** diese Roadmap-Datei nach jeder Phase stutzen (erledigte
  Phasen nach unten in Abschnitt „Abgeschlossen" verschieben)

---

## Offene Fragen

Vor Start einzelner Phasen zu klären:

- **Phase 8:** Woher bezieht sich die Management-Hierarchie — manuell pflegen
  oder aus Entra Org-Graph?
- **Phase 10:** SMTP-Server verfügbar? Interne Relay-Adresse?
- **Phase 12:** Azure-App-Registrierung existiert schon? Redirect-URIs
  (`/api/auth/callback/azure-ad`) registrieren.
- **Phase 16:** Welche Spalten pro Import/Export — Vorschlag vorab definieren.
- **Phase 20:** Wer darf das F3-Dashboard sehen? Nur GF+Bereichsleitung, oder
  alle Champions?
