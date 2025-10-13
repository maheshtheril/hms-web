export const dynamic = 'force-dynamic';
// =============================================
// 📁 Folder structure (suggested)
// =============================================
// backend/
//   src/
//     api/
//       leads.routes.ts
//       middleware/
//         requireAuth.ts
//     services/
//       leadsService.ts
//     db.ts
//     server.ts
// web/
//   app/
//     crm/
//       leads/
//         new/ClientEntry.tsx
//         new/page.tsx
//     components/
//       leads/
//         QuickLeadDrawer.tsx
//         DetailedLeadDrawer.tsx
//       ui/
//         Drawer.tsx
//         Input.tsx
//         Textarea.tsx
//         Select.tsx
//         Button.tsx
//   lib/
//     api.ts
// =============================================





// =============================================
// backend/src/services/leadsService.ts — DB access
// =============================================

// =============================================
// backend/src/api/leads.routes.ts — POST /api/leads (quick or detailed)
// =============================================

// =============================================
// backend/src/server.ts — mount router
// =============================================



// =============================================
// web/app/components/ui primitives (unstyled Tailwind)
// =============================================
// web/app/components/ui/Button.tsx


// web/app/components/ui/Input.tsx


// web/app/components/ui/Textarea.tsx
// web/app/components/ui/Select.tsx


// web/app/components/ui/Drawer.tsx — simple right-side drawer
// =============================================
// web/app/components/leads/QuickLeadDrawer.tsx — minimal fast form
// =============================================

// =============================================
// web/app/components/leads/DetailedLeadDrawer.tsx — full form
// =============================================

// =============================================
// web/app/crm/leads/new/page.tsx — server route that mounts client
// =============================================
import ClientEntry from "./ClientEntry";
export default function Page() { return <Suspense fallback={<div>Loading...</div>}></Suspense>; }

// =============================================
// web/app/crm/leads/new/ClientEntry.tsx — detects ?mode=quick|detailed
// =============================================

// =============================================
// 🔌 How to wire from Topbar or Dashboard quick actions
// =============================================
// Example: a "+ New Lead" button that sends to /crm/leads/new?mode=quick
// <Link href="/crm/leads/new?mode=quick"><Button>+ New Lead</Button></Link>
// Or open Detailed: /crm/leads/new?mode=detailed

// =============================================
// ✅ Notes
// - Backend assumes a `leads` table with columns used above; adapt names if yours differ.
// - Auth: replace `requireAuth` with your real session middleware; set x-user-id/x-tenant-id in SSR fetch if needed.
// - Frontend uses a very small UI kit (Tailwind) to avoid external deps; swap to shadcn/ui if you already have it.
// - URL-driven mode lets you invoke Quick vs Detailed from anywhere (dashboard, sidebar, mobile FAB).
// - Both drawers call the SAME POST /api/leads; detailed just sends more fields.
// - Add RLS/Audit/History triggers as in your existing project. This file focuses on creation flows.
