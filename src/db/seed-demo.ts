/**
 * Fills the system with realistic demo tickets, comments and history
 * about the ticket system itself (improvements & wishes).
 *   npm run db:seed-demo
 */
import "reflect-metadata";
import { getDataSource } from "./data-source";
import { User } from "./entities/User";

// ─── Ticket definitions ────────────────────────────────────────────────────────

const TICKETS = [
  // ── DONE ───────────────────────────────────────────────────────────────────
  {
    title: "Implement user authentication with role-based access control",
    description:
      "The system needs a secure login mechanism. Users must be able to sign in with email and password. Different roles (CLIENT, DEVELOPER, MANAGER, ADMIN) must have different access rights throughout the application.",
    acceptanceCriteria:
      "- Login page is accessible at /login\n- Invalid credentials show a clear error message\n- Successful login redirects to /dashboard\n- Admin routes (/admin) redirect non-admins to /dashboard\n- Session persists across browser refreshes",
    affectedModule: "Authentication",
    priority: "CRITICAL" as const,
    status: "DONE" as const,
    creatorRole: "CLIENT",
    assigneeRole: "DEVELOPER",
    history: ["OPEN", "IN_PROGRESS", "REVIEW", "DONE"],
    comments: [
      { role: "MANAGER", text: "This is the foundation of the entire system. Top priority.", isInternal: false },
      { role: "DEVELOPER", text: "Implemented using NextAuth v4 with credentials provider. JWT tokens carry the user role so middleware can protect routes server-side.", isInternal: true },
      { role: "CLIENT", text: "Login works great. The error messages are clear and the redirect is instant.", isClientQuestion: false },
      { role: "MANAGER", text: "Verified — marking as done.", isInternal: false },
    ],
  },
  {
    title: "Create Oracle Autonomous DB migration script",
    description:
      "We need a one-time script that creates all required database tables in the Oracle Autonomous Database. The script should be idempotent — running it twice should not fail.",
    acceptanceCriteria:
      "- Running `npm run db:migrate` creates all tables\n- Re-running skips existing tables without error\n- All foreign key constraints are in place\n- Script reads credentials from .env.local",
    affectedModule: "Database",
    priority: "CRITICAL" as const,
    status: "DONE" as const,
    creatorRole: "DEVELOPER",
    assigneeRole: "DEVELOPER",
    history: ["OPEN", "IN_PROGRESS", "DONE"],
    comments: [
      { role: "DEVELOPER", text: "Used raw oracledb for the DDL statements. TypeORM doesn't handle Oracle wallet config well in thin mode so we bypass it for migrations.", isInternal: true },
      { role: "DEVELOPER", text: "Wallet connection was the tricky part — ewallet.pem is encrypted so we need walletPassword passed explicitly.", isInternal: true },
      { role: "MANAGER", text: "Tables verified in Oracle Cloud SQL developer. All constraints look good.", isInternal: false },
    ],
  },
  {
    title: "Design flashy modern login page",
    description:
      "The default PrimeReact login card looks plain. We want a modern, visually impressive login screen that makes a good first impression. Dark theme with animated background.",
    acceptanceCriteria:
      "- Animated gradient background\n- Glassmorphism card effect\n- Logo/brand icon visible\n- Inputs styled to match dark theme\n- Smooth entry animation\n- Works on mobile and desktop",
    affectedModule: "UI / Login",
    priority: "MEDIUM" as const,
    status: "DONE" as const,
    creatorRole: "CLIENT",
    assigneeRole: "DEVELOPER",
    history: ["OPEN", "IN_PROGRESS", "REVIEW", "DONE"],
    comments: [
      { role: "CLIENT", text: "The old login page looked like a school project. Can we make it look more professional?", isClientQuestion: false },
      { role: "DEVELOPER", text: "Rebuilt with CSS modules: animated mesh gradient, glowing orbs, frosted glass card, gradient button. Dropped the PrimeReact Card component in favour of custom markup.", isInternal: true },
      { role: "CLIENT", text: "Wow, this looks amazing! Exactly what I had in mind.", isClientQuestion: false },
    ],
  },

  // ── IN_PROGRESS ─────────────────────────────────────────────────────────────
  {
    title: "Add full-text search across tickets",
    description:
      "Users need to quickly find tickets by keyword. Search should cover ticket title, description, and comments. Results should highlight the matching term.",
    acceptanceCriteria:
      "- Search bar visible on the ticket list page\n- Results update as user types (debounced, 300 ms)\n- Matching keyword is highlighted in results\n- Search covers title, description and comment content\n- Empty state shown when no results found",
    affectedModule: "Tickets",
    priority: "HIGH" as const,
    status: "IN_PROGRESS" as const,
    creatorRole: "CLIENT",
    assigneeRole: "DEVELOPER",
    history: ["OPEN", "IN_PROGRESS"],
    comments: [
      { role: "CLIENT", text: "We have over 200 tickets now and it is really hard to find anything. A search bar is essential.", isClientQuestion: false },
      { role: "MANAGER", text: "Agreed. Assigning to Dave for this sprint.", isInternal: false },
      { role: "DEVELOPER", text: "Planning to use Oracle CONTAINS() with a context index on TITLE and DESCRIPTION. Will add a separate API route GET /api/tickets?q=...", isInternal: true },
      { role: "CLIENT", text: "Will the search also work on comments?", isClientQuestion: true },
      { role: "DEVELOPER", text: "Yes, we can join TICKET_COMMENTS and search content there too. Might be a bit slower but Oracle context indexes handle it well.", isInternal: false },
    ],
  },
  {
    title: "Email notifications on ticket status change",
    description:
      "When a ticket status changes, the ticket creator and the assigned developer should receive an email notification. The email should include the ticket title, the old and new status, and a direct link to the ticket.",
    acceptanceCriteria:
      "- Email sent to creator when ticket moves to any new status\n- Email sent to assignee when ticket is assigned to them\n- Emails are queued via JOB_QUEUE to avoid blocking the API response\n- Email includes a deep link to the ticket\n- SMTP config is read from .env.local",
    affectedModule: "Notifications",
    priority: "HIGH" as const,
    status: "IN_PROGRESS" as const,
    creatorRole: "MANAGER",
    assigneeRole: "DEVELOPER",
    history: ["OPEN", "IN_PROGRESS"],
    comments: [
      { role: "MANAGER", text: "Clients are complaining they have to keep checking the system manually. Push notifications or email would help a lot.", isInternal: false },
      { role: "DEVELOPER", text: "Using nodemailer v7 with SMTP. Emails are inserted as JOB_QUEUE rows and the background worker picks them up every 5 seconds. This way the API stays fast.", isInternal: true },
      { role: "DEVELOPER", text: "Note: nodemailer had to be downgraded to v7 for next-auth peer dep compatibility.", isInternal: true },
    ],
  },
  {
    title: "File attachment preview in ticket detail",
    description:
      "When a user opens a ticket with attachments, images should display as inline thumbnails rather than just download links. PDFs should show a preview icon with a page count.",
    acceptanceCriteria:
      "- Image attachments (jpg, png, gif, webp) render as thumbnails (max 120×120 px)\n- Clicking a thumbnail opens a lightbox with the full-size image\n- PDF attachments show a PDF icon with filename and size\n- Non-image/PDF attachments show a generic file icon\n- Download link available for all attachment types",
    affectedModule: "Attachments",
    priority: "MEDIUM" as const,
    status: "IN_PROGRESS" as const,
    creatorRole: "CLIENT",
    assigneeRole: "DEVELOPER",
    history: ["OPEN", "IN_PROGRESS"],
    comments: [
      { role: "CLIENT", text: "It is annoying to download every file just to see if it is the right one. Thumbnails would save a lot of time.", isClientQuestion: false },
      { role: "DEVELOPER", text: "Will use the PrimeReact Galleria component for the lightbox. Image thumbnails are served via /api/attachments/[id]/thumb which resizes on the fly using the sharp package.", isInternal: true },
    ],
  },

  // ── REVIEW ──────────────────────────────────────────────────────────────────
  {
    title: "Dashboard: add charts for ticket statistics",
    description:
      "The dashboard currently shows only a list of recent tickets. We need charts that give managers an overview of the system health: tickets by status, tickets by priority, and a trend line of tickets created per week.",
    acceptanceCriteria:
      "- Doughnut chart: tickets by status (OPEN, IN_PROGRESS, REVIEW, DONE)\n- Bar chart: tickets by priority (LOW, MEDIUM, HIGH, CRITICAL)\n- Line chart: tickets created per week (last 8 weeks)\n- Charts are responsive and readable on tablet\n- Data is fetched from a dedicated /api/stats endpoint",
    affectedModule: "Dashboard",
    priority: "HIGH" as const,
    status: "REVIEW" as const,
    creatorRole: "MANAGER",
    assigneeRole: "DEVELOPER",
    history: ["OPEN", "IN_PROGRESS", "REVIEW"],
    comments: [
      { role: "MANAGER", text: "I need to show the board a weekly report. Right now I have to count tickets manually in a spreadsheet.", isClientQuestion: false },
      { role: "DEVELOPER", text: "Using PrimeReact Chart component which wraps Chart.js. Had to install chart.js separately as it's a peer dep not bundled with PrimeReact v10.", isInternal: true },
      { role: "MANAGER", text: "Charts look great in the preview! Can we add an 'average resolution time' metric too?", isClientQuestion: false },
      { role: "DEVELOPER", text: "Added as a KPI card below the charts. Calculated as AVG(updated_at - created_at) WHERE status = DONE.", isInternal: true },
    ],
  },
  {
    title: "Admin panel: user management",
    description:
      "Admins need to be able to create, edit and deactivate users from within the application. Currently the only way to add users is via the seed script.",
    acceptanceCriteria:
      "- /admin page lists all users with name, email, role and created date\n- Admin can create a new user (name, email, role, temporary password)\n- Admin can change any user's role\n- Admin can deactivate a user (they can no longer log in)\n- Actions are confirmed with a dialog before executing",
    affectedModule: "Admin",
    priority: "HIGH" as const,
    status: "REVIEW" as const,
    creatorRole: "MANAGER",
    assigneeRole: "DEVELOPER",
    history: ["OPEN", "IN_PROGRESS", "REVIEW"],
    comments: [
      { role: "MANAGER", text: "Onboarding new team members requires a developer to run scripts. This has to change.", isClientQuestion: false },
      { role: "DEVELOPER", text: "Built on top of the existing /api/admin/users routes. Added a DataTable with inline role dropdown and a ConfirmDialog for destructive actions.", isInternal: true },
      { role: "MANAGER", text: "Tested — everything works. Minor nit: the 'Deactivate' button should be red, not grey.", isClientQuestion: false },
      { role: "DEVELOPER", text: "Fixed the button colour. Ready for final sign-off.", isInternal: false },
    ],
  },

  // ── OPEN ─────────────────────────────────────────────────────────────────────
  {
    title: "Mobile-responsive layout for ticket list and detail",
    description:
      "The application is currently usable only on desktop. Managers and clients often check tickets on their phone. The ticket list and detail pages need to be fully responsive.",
    acceptanceCriteria:
      "- Ticket list is readable on screens ≥ 375 px wide\n- Sidebar collapses to a hamburger menu on mobile\n- Ticket detail page wraps metadata below the description on small screens\n- Touch targets (buttons, links) are at least 44×44 px\n- No horizontal scroll on any core page",
    affectedModule: "UI / Responsive",
    priority: "HIGH" as const,
    status: "OPEN" as const,
    creatorRole: "CLIENT",
    assigneeRole: null,
    history: ["OPEN"],
    comments: [
      { role: "CLIENT", text: "I tried to check a ticket on my phone during a meeting and it was basically unusable. Lots of horizontal scrolling.", isClientQuestion: false },
      { role: "MANAGER", text: "This is a reasonable request. We'll plan it for the next sprint.", isInternal: false },
    ],
  },
  {
    title: "Wish: bulk status update for multiple tickets",
    description:
      "When closing a sprint or resolving a batch of related issues, it would save a lot of time to select multiple tickets and update their status in one action.",
    acceptanceCriteria:
      "- Ticket list shows checkboxes when user hovers or enters select mode\n- A floating action bar appears when ≥ 1 ticket is selected\n- Action bar shows: Set Status, Set Priority, Assign To\n- Confirmation dialog shows how many tickets will be affected\n- Bulk operations are executed in a single API call",
    affectedModule: "Tickets",
    priority: "MEDIUM" as const,
    status: "OPEN" as const,
    creatorRole: "MANAGER",
    assigneeRole: null,
    history: ["OPEN"],
    comments: [
      { role: "MANAGER", text: "End of sprint we have 15-20 tickets to mark DONE one by one. A bulk action would save 10 minutes every sprint.", isClientQuestion: false },
      { role: "DEVELOPER", text: "Technically straightforward. We can add a PATCH /api/tickets endpoint that accepts an array of IDs and the new values.", isInternal: true },
    ],
  },
  {
    title: "Wish: keyboard shortcuts for power users",
    description:
      "Developers and managers who live in the ticket system all day would benefit from keyboard shortcuts. Inspired by tools like Linear and Jira.",
    acceptanceCriteria:
      "- 'N' opens new ticket form from any page\n- 'F' focuses the search bar\n- '?' shows a shortcuts cheat-sheet overlay\n- Arrow keys navigate the ticket list\n- 'Enter' opens the selected ticket\n- Shortcuts are suppressed when an input/textarea is focused",
    affectedModule: "UI / Accessibility",
    priority: "LOW" as const,
    status: "OPEN" as const,
    creatorRole: "DEVELOPER",
    assigneeRole: null,
    history: ["OPEN"],
    comments: [
      { role: "DEVELOPER", text: "Linear does this really well. We could use a small library like `hotkeys-js` or just native `keydown` listeners.", isInternal: true },
      { role: "MANAGER", text: "Nice-to-have for sure. Low priority but a great quality-of-life improvement for the dev team.", isInternal: false },
    ],
  },
  {
    title: "Wish: dark mode support",
    description:
      "Developers often work in dark environments and prefer dark mode. The application should respect the OS preference and also allow manual toggle.",
    acceptanceCriteria:
      "- App respects prefers-color-scheme media query on first load\n- Toggle in the top navigation bar switches between light and dark\n- Preference is persisted in localStorage\n- All pages (including login) switch correctly\n- PrimeReact theme switches to lara-dark-blue in dark mode",
    affectedModule: "UI / Theming",
    priority: "LOW" as const,
    status: "OPEN" as const,
    creatorRole: "DEVELOPER",
    assigneeRole: null,
    history: ["OPEN"],
    comments: [
      { role: "DEVELOPER", text: "The login page already has a dark design. We can extend that aesthetic to the whole app by swapping the PrimeReact theme link at runtime.", isInternal: true },
      { role: "CLIENT", text: "My entire team would love this. We all use dark mode everywhere.", isClientQuestion: false },
    ],
  },
  {
    title: "Wish: AI-assisted ticket description completion",
    description:
      "When a client creates a ticket, the description is often incomplete or vague. An AI assistant should suggest a better-structured description and acceptance criteria based on a short summary the client types.",
    acceptanceCriteria:
      "- 'Improve with AI' button appears on the new ticket form\n- Button is disabled until at least 20 characters are typed in the description\n- Clicking the button calls the Claude API with the current description\n- AI returns a structured description and acceptance criteria\n- User can accept, reject or manually edit the suggestion\n- API key is never exposed to the client",
    affectedModule: "AI / Tickets",
    priority: "MEDIUM" as const,
    status: "OPEN" as const,
    creatorRole: "MANAGER",
    assigneeRole: null,
    history: ["OPEN"],
    comments: [
      { role: "CLIENT", text: "Half the time I don't know exactly how to describe a problem. If AI could help me fill in the blanks that would be amazing.", isClientQuestion: false },
      { role: "DEVELOPER", text: "We already have the Anthropic API key in .env.local and the AI validation infrastructure in place. Adding a completion endpoint should be relatively quick.", isInternal: true },
      { role: "MANAGER", text: "This would also reduce back-and-forth because tickets would arrive with proper acceptance criteria from the start.", isInternal: false },
    ],
  },
  {
    title: "Performance: add connection pooling for Oracle DB",
    description:
      "Currently every request that hits the database opens a new connection via TypeORM's default pool. Under load this causes noticeable latency spikes. We should tune the connection pool settings for the Oracle Autonomous DB tier.",
    acceptanceCriteria:
      "- Pool min: 2, max: 10 connections configured in DataSource\n- Pool settings are tunable via environment variables\n- Health check endpoint /api/health reports pool status\n- No 'max connections exceeded' errors under 20 concurrent users",
    affectedModule: "Database / Performance",
    priority: "HIGH" as const,
    status: "OPEN" as const,
    creatorRole: "DEVELOPER",
    assigneeRole: null,
    history: ["OPEN"],
    comments: [
      { role: "DEVELOPER", text: "TypeORM Oracle driver supports pool options via the `extra` object. Can set poolMin, poolMax, poolIncrement. Should also consider using db01_tp (transaction processing) instead of db01_high for better connection handling.", isInternal: true },
    ],
  },
  {
    title: "Wish: GitHub commit linking on tickets",
    description:
      "Developers should be able to link GitHub commits and pull requests to a ticket. This gives managers full traceability from business requirement to code change.",
    acceptanceCriteria:
      "- Ticket detail page has a 'Linked commits' section\n- Developer can paste a GitHub PR or commit URL\n- System fetches PR title, status and author from GitHub API\n- Linked PRs show status badge (OPEN, MERGED, CLOSED)\n- Clicking a link opens GitHub in a new tab",
    affectedModule: "Integrations / GitHub",
    priority: "MEDIUM" as const,
    status: "OPEN" as const,
    creatorRole: "MANAGER",
    assigneeRole: null,
    history: ["OPEN"],
    comments: [
      { role: "MANAGER", text: "Right now I have no idea which code change corresponds to which ticket. Linking them would make code reviews much easier.", isClientQuestion: false },
      { role: "DEVELOPER", text: "We already have a GITHUB_TOKEN in .env.local. The GitHub REST API v3 is well documented. This is mostly a UI task.", isInternal: true },
    ],
  },
];

// ─── Helper ────────────────────────────────────────────────────────────────────

function statusTransitions(history: string[]): Array<{ from: string | null; to: string }> {
  return history.map((status, i) => ({ from: i === 0 ? null : history[i - 1], to: status }));
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function seedDemo() {
  const ds = await getDataSource();

  const userRepo = ds.getRepository(User);

  // Load seed users indexed by role
  const allUsers = await userRepo.find();
  const byRole: Record<string, User> = {};
  for (const u of allUsers) byRole[u.role] = u;

  const required = ["ADMIN", "MANAGER", "DEVELOPER", "CLIENT"];
  for (const r of required) {
    if (!byRole[r]) throw new Error(`Seed user with role ${r} not found — run npm run db:seed first`);
  }

  let ticketsCreated = 0;

  for (const t of TICKETS) {
    const creator  = byRole[t.creatorRole];
    const assignee = t.assigneeRole ? byRole[t.assigneeRole] : null;

    // Skip if already seeded
    const existing = await ds.query(`SELECT ID FROM TICKETS WHERE TITLE = :1`, [t.title]);
    if (existing.length > 0) {
      console.log(`  skipped  "${t.title.substring(0, 60)}…"`);
      continue;
    }

    // Raw INSERT for all tables — bypasses TypeORM's duplicate-column bug
    // that occurs when @Column and @JoinColumn share the same column name.
    await ds.query(
      `INSERT INTO TICKETS (TITLE, DESCRIPTION, ACCEPTANCE_CRITERIA, AFFECTED_MODULE,
         PRIORITY, STATUS, CREATOR_ID, ASSIGNEE_ID, AWAITING_CLIENT)
       VALUES (:1, :2, :3, :4, :5, :6, :7, :8, 0)`,
      [t.title, t.description, t.acceptanceCriteria, t.affectedModule,
       t.priority, t.status, creator.id, assignee?.id ?? null],
    );
    const idRows = await ds.query(
      `SELECT MAX(ID) AS ID FROM TICKETS WHERE TITLE = :1 AND CREATOR_ID = :2`,
      [t.title, creator.id],
    );
    const ticketId: number = idRows[0].ID;

    // History — raw SQL
    for (const { from, to } of statusTransitions(t.history)) {
      const changedBy = to === "OPEN" ? creator : (assignee ?? byRole["MANAGER"]);
      await ds.query(
        `INSERT INTO TICKET_HISTORY (TICKET_ID, FROM_STATUS, TO_STATUS, CHANGED_BY_ID)
         VALUES (:1, :2, :3, :4)`,
        [ticketId, from ?? null, to, changedBy.id],
      );
    }

    // Comments — raw SQL
    for (const c of t.comments ?? []) {
      const author = byRole[c.role];
      await ds.query(
        `INSERT INTO TICKET_COMMENTS (TICKET_ID, USER_ID, CONTENT, IS_INTERNAL, IS_CLIENT_QUESTION)
         VALUES (:1, :2, :3, :4, :5)`,
        [ticketId, author.id, c.text,
         c.isInternal ? 1 : 0,
         (c as any).isClientQuestion ? 1 : 0],
      );
    }

    console.log(`✓ [${t.status.padEnd(11)}] [${t.priority.padEnd(8)}] ${t.title.substring(0, 70)}`);
    ticketsCreated++;
  }

  console.log(`\nDone — ${ticketsCreated} tickets created.`);
  await ds.destroy();
}

seedDemo().catch((err) => {
  console.error("Demo seed failed:", err);
  process.exit(1);
});
