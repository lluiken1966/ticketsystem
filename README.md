# Ticket System

Full-stack ticket management system with AI-powered validation and Bitbucket code analysis.

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **PrimeReact 10** (UI components, PrimeFlex layout)
- **Oracle Autonomous DB** + **TypeORM**
- **Claude Sonnet** (Anthropic API) for AI agents
- **Nodemailer** (SMTP email notifications)
- **Docker Compose** for local deployment

---

## Setup

### 1. Prerequisites

- Node.js 20+
- Docker Desktop
- Oracle Autonomous DB (Oracle Cloud — free tier works)

### 2. Install dependencies

```bash
cd ticket-system
npm install
```

### 3. Oracle Wallet

1. Log in to [Oracle Cloud Console](https://cloud.oracle.com)
2. Go to **Autonomous Database** → your DB → **Database Connection**
3. Download **Wallet** (Instance Wallet)
4. Unzip the wallet into the `wallet/` folder in this project

```
ticket-system/
  wallet/
    cwallet.sso
    ewallet.p12
    tnsnames.ora
    ...
```

5. Open `wallet/tnsnames.ora` — copy your service name (e.g. `ticketdb_high`)

### 4. Configure environment

Edit `.env.local` and fill in:

```bash
# Oracle
ORACLE_USER=ADMIN
ORACLE_PASSWORD=your-oracle-password
ORACLE_SERVICE=ticketdb_high        # from tnsnames.ora
TNS_ADMIN=./wallet

# Auth
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Bitbucket
BITBUCKET_WORKSPACE=your-workspace
BITBUCKET_REPO=your-repo

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password          # Gmail App Password (not your real password)
SMTP_FROM=noreply@yourdomain.com
```

### 5. Create database tables

```bash
npm run db:migrate
```

### 6. Seed admin user

```bash
npm run db:seed
```

Default credentials:
- **Email:** `admin@ticketsystem.local`
- **Password:** `Admin123!`
- ⚠️ Change this immediately after first login via Admin → Users

### 7. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 8. Run with Docker

```bash
docker compose up --build
```

---

## User Roles

| Role | What they can do |
|---|---|
| **Client** | Submit tickets, view own tickets, reply to questions |
| **Developer** | View all tickets, move lanes, assign, comment, ask client questions |
| **Admin** | Everything + manage users, configure settings |
| **Manager** | Read-only dashboard |

## Ticket Workflow

```
Open → In Progress → Review → Done
```

- Developers move tickets manually (no auto-moves)
- AI validates each ticket for completeness in the background
- Developers can trigger Bitbucket code analysis from the ticket page

## Email Notifications

| Event | Who gets notified |
|---|---|
| Ticket changes lane | Ticket creator (client) |
| Ticket enters In Progress | Assigned developer |
| Ticket assigned to developer | That developer |
| Developer asks client a question | Client (via email) |
| Client answers question | Developer who asked |

---

## Project Structure

```
app/
  (auth)/login/         Login page
  dashboard/            Dashboard with charts and filters
  tickets/              Kanban board + list view
  tickets/new/          Submit new ticket
  tickets/[id]/         Ticket detail, comments, AI panels
  admin/                User management + settings
  api/...               REST API routes

components/
  AppShell.tsx          Navigation bar + layout
  KanbanBoard.tsx       4-lane Kanban view
  AiValidationPanel.tsx Claude completeness check panel
  AiCodeAnalysisPanel.tsx Bitbucket code location panel
  CommentThread.tsx     Comments, internal notes, client Q&A

lib/
  auth.ts               NextAuth configuration
  email.ts              Nodemailer email helpers
  jobs.ts               Oracle-backed background job queue
  bitbucket.ts          Bitbucket REST API client
  ai/validator.ts       AI Agent 1: ticket completeness
  ai/codeSearcher.ts    AI Agent 2: code location finder

src/db/
  data-source.ts        TypeORM Oracle connection
  entities/             TypeORM entity classes
  migrate.ts            Run once to create all tables
  seed.ts               Create initial admin user
```
