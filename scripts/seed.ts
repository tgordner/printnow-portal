/**
 * Seed script — populates the database with realistic test data.
 *
 * Run with:  npx tsx scripts/seed.ts
 *
 * Creates:
 *  - 5 fake team members (non-loginable, display only)
 *  - Labels for both boards
 *  - ~25 cards spread across columns with varied priorities, due dates, descriptions
 *  - Comments with longer realistic messages
 *  - 1 customer with access to the Core Development board
 *  - A few placeholder attachments (Supabase Storage upload)
 */

import { readFileSync } from "fs"
import { resolve } from "path"

// Load env files manually (no dotenv dependency needed)
function loadEnv(filePath: string) {
  try {
    const content = readFileSync(resolve(filePath), "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIdx = trimmed.indexOf("=")
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx)
      let value = trimmed.slice(eqIdx + 1)
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = value
    }
  } catch {}
}
loadEnv(".env.local")
loadEnv(".env")

// Force direct connection URL for Prisma (not the pooler)
process.env.DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL

import { PrismaClient } from "@prisma/client"
import { createClient } from "@supabase/supabase-js"

const prisma = new PrismaClient()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const ORG_ID = "cml8uf6tu0002n8iju48yn88v"
const TODD_ID = "cml8uf6tu0000n8ijsmp3z8oa"

// Board: Core Development
const CORE_BOARD_ID = "cml9r47620005n8ubuplaw7r0"
const CORE_TODO = "cml9r47620006n8ubx29o33gd"
const CORE_DONE = "cml9r47620008n8ubydltmi6r"
const CORE_IN_PROGRESS = "cml9r47620007n8ub9nc9s31m"

// Board: Sales and Marketing
const SALES_BOARD_ID = "cmla30i2o000dn8oy54wxoi5h"
const SALES_TODD = "cmla30i2o000en8oyb543mbu4"
const SALES_ROBIN = "cmla30i2o000fn8oy2vhakans"
const SALES_TRACI = "cmla30i2o000gn8oysyln3k8s"
const SALES_ON_HOLD = "cmla32j6h000yn8oy8b1qdxrj"

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(12, 0, 0, 0)
  return d
}

async function main() {
  console.log("Seeding test data...\n")

  // ---- 1. Create fake team members ----
  console.log("Creating team members...")
  const fakeUsers = [
    { name: "Sarah Chen", email: "sarah.chen@printnow.com" },
    { name: "Marcus Johnson", email: "marcus.johnson@printnow.com" },
    { name: "Emily Rodriguez", email: "emily.rodriguez@printnow.com" },
    { name: "James Park", email: "james.park@printnow.com" },
    { name: "Robin Taylor", email: "robin.taylor@printnow.com" },
  ]

  const createdUsers = []
  for (const u of fakeUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (existing) {
      createdUsers.push(existing)
      continue
    }
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        supabaseId: `fake-${u.email.split("@")[0]}-${Date.now()}`,
        memberships: {
          create: { organizationId: ORG_ID, role: "MEMBER" },
        },
      },
    })
    createdUsers.push(user)
  }
  console.log(`  Created ${createdUsers.length} team members`)

  const [sarah, marcus, emily, james, robin] = createdUsers
  const allUsers = [
    { id: TODD_ID, name: "Todd Gordner" },
    ...createdUsers.map((u) => ({ id: u.id, name: u.name! })),
  ]

  // Add board members
  for (const user of createdUsers) {
    await prisma.boardMember.upsert({
      where: { boardId_userId: { boardId: CORE_BOARD_ID, userId: user.id } },
      create: { boardId: CORE_BOARD_ID, userId: user.id },
      update: {},
    })
    await prisma.boardMember.upsert({
      where: { boardId_userId: { boardId: SALES_BOARD_ID, userId: user.id } },
      create: { boardId: SALES_BOARD_ID, userId: user.id },
      update: {},
    })
  }

  // ---- 2. Create labels ----
  console.log("Creating labels...")
  const coreLabels = [
    { name: "Bug", color: "#ef4444", boardId: CORE_BOARD_ID },
    { name: "Feature", color: "#3b82f6", boardId: CORE_BOARD_ID },
    { name: "Enhancement", color: "#8b5cf6", boardId: CORE_BOARD_ID },
    { name: "DevOps", color: "#f97316", boardId: CORE_BOARD_ID },
    { name: "Documentation", color: "#6b7280", boardId: CORE_BOARD_ID },
    { name: "Urgent", color: "#dc2626", boardId: CORE_BOARD_ID },
  ]
  const salesLabels = [
    { name: "Hot Lead", color: "#ef4444", boardId: SALES_BOARD_ID },
    { name: "Follow Up", color: "#f59e0b", boardId: SALES_BOARD_ID },
    { name: "Partnership", color: "#10b981", boardId: SALES_BOARD_ID },
    { name: "Content", color: "#6366f1", boardId: SALES_BOARD_ID },
    { name: "Event", color: "#ec4899", boardId: SALES_BOARD_ID },
  ]

  const labelRecords: Record<string, string> = {}
  for (const l of [...coreLabels, ...salesLabels]) {
    const existing = await prisma.label.findFirst({
      where: { boardId: l.boardId, name: l.name },
    })
    if (existing) {
      labelRecords[l.name] = existing.id
    } else {
      const label = await prisma.label.create({ data: l })
      labelRecords[l.name] = label.id
    }
  }
  console.log(`  Created ${Object.keys(labelRecords).length} labels`)

  // ---- 3. Create cards for Core Development ----
  console.log("Creating Core Development cards...")

  interface CardSeed {
    columnId: string
    title: string
    description: string | null
    priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT"
    dueDate: Date | null
    labels: string[]
    assignees: string[]
    comments: { userId: string; content: string }[]
  }

  const coreCards: CardSeed[] = [
    // To Do
    {
      columnId: CORE_TODO,
      title: "Implement webhook system for order status updates",
      description:
        "We need a webhook system that can notify external integrations when order statuses change. This should support:\n\n- Configurable webhook URLs per storefront\n- Retry logic with exponential backoff (max 5 retries)\n- HMAC signature verification for security\n- Event types: order.created, order.updated, order.shipped, order.completed\n\nThe webhook payloads should match our existing API v2 response format for consistency.",
      priority: "HIGH",
      dueDate: daysFromNow(7),
      labels: ["Feature"],
      assignees: [sarah.id, marcus.id],
      comments: [
        {
          userId: sarah.id,
          content:
            "I've been looking at how Stripe and Shopify handle webhooks for reference. I think we should use a queue-based approach (maybe with Azure Service Bus) rather than firing them synchronously during the order update. That way we don't slow down the main request if a webhook endpoint is slow or down.",
        },
        {
          userId: TODD_ID,
          content:
            "Good call on the queue approach. Let's also make sure we log every delivery attempt with the response code so we can debug customer issues easily. Maybe a WebhookDelivery table?",
        },
        {
          userId: marcus.id,
          content:
            "I can handle the database schema and the delivery logging piece. Sarah, want to take the queue consumer and the actual HTTP dispatch logic? We should also add a test endpoint in the admin UI where customers can send a test ping.",
        },
      ],
    },
    {
      columnId: CORE_TODO,
      title: "Upgrade PDF generation to use PNPDF library",
      description:
        "Replace all PdfSharp 1.35 usage in PrintNowData\\PDF\\ with our custom PNPDF library. This is a significant change since PNPDF handles font subsetting, CMYK colors, and PDF/X-4 compliance differently.\n\nKey files to update:\n- PDFHelper.vb\n- ProductPDFGenerator.vb\n- OrderProofGenerator.vb\n\nNeed to run comparison tests between PdfSharp output and PNPDF output to verify visual parity before deploying.",
      priority: "MEDIUM",
      dueDate: daysFromNow(14),
      labels: ["Enhancement"],
      assignees: [james.id],
      comments: [
        {
          userId: james.id,
          content:
            "I've run the initial comparison tests (Category 1-3) and most pass. There are a few edge cases with transparency blending in Category 3 that produce slightly different results — the PNPDF output is actually more correct per the PDF spec, but it means our regression screenshots won't match 1:1. Should we update the baselines or try to match PdfSharp's behavior?",
        },
        {
          userId: TODD_ID,
          content:
            "If the PNPDF output is more spec-correct, let's go with that and update the baselines. We'll want to do a manual visual QA pass on the top 20 most-ordered products before we ship it though.",
        },
      ],
    },
    {
      columnId: CORE_TODO,
      title: "Add batch order processing API endpoint",
      description: "Create a v2 API endpoint that accepts an array of orders (up to 50) in a single request. This is requested by several large resellers who currently submit orders one at a time and hit rate limits.",
      priority: "MEDIUM",
      dueDate: daysFromNow(10),
      labels: ["Feature"],
      assignees: [emily.id],
      comments: [],
    },
    {
      columnId: CORE_TODO,
      title: "Fix TaxJar tax calculation timeout on large orders",
      description: "Orders with 20+ line items sometimes timeout when calculating tax through TaxJar. Need to investigate whether we should batch the line items or switch to their bulk calculation endpoint.",
      priority: "HIGH",
      dueDate: daysFromNow(3),
      labels: ["Bug", "Urgent"],
      assignees: [sarah.id],
      comments: [
        {
          userId: sarah.id,
          content:
            "I traced the issue — we're making a separate API call per line item instead of using TaxJar's batch endpoint. A 25-item order makes 25 sequential HTTP calls. I'll refactor to use their /v2/taxes endpoint which accepts multiple line items. Should cut the time from ~8s to under 500ms.",
        },
      ],
    },
    {
      columnId: CORE_TODO,
      title: "Set up staging environment monitoring with Application Insights",
      description: "We keep finding out about staging issues from QA instead of from alerts. Set up Application Insights dashboards and alerts for error rate, response time p95, and failed dependency calls.",
      priority: "LOW",
      dueDate: daysFromNow(21),
      labels: ["DevOps"],
      assignees: [marcus.id],
      comments: [],
    },

    // In Progress
    {
      columnId: CORE_IN_PROGRESS,
      title: "Migrate admin API authentication from OWIN to JWT",
      description:
        "The current OWIN OAuth2 middleware is getting outdated and has some security concerns. Migrating to standard JWT tokens will:\n\n1. Simplify the auth flow\n2. Allow us to share tokens between the admin API and editor API\n3. Make it easier to implement refresh tokens properly\n\nCurrently about 60% done — the token generation and validation middleware is complete, working on updating all controller authorization attributes.",
      priority: "HIGH",
      dueDate: daysFromNow(0), // due today
      labels: ["Enhancement"],
      assignees: [TODD_ID, marcus.id],
      comments: [
        {
          userId: marcus.id,
          content:
            "I've updated 14 of 22 controllers to use the new [JwtAuthorize] attribute. The tricky ones are the controllers that use custom role claims — OrderController and CustomerController both check for storefront-specific permissions that were baked into the OWIN token. I need to figure out how to represent those in the JWT claims.",
        },
        {
          userId: TODD_ID,
          content:
            "For the storefront-specific permissions, let's add a 'sf_perms' claim that's a JSON object keyed by storefront ID. Something like: {\"sf_123\": [\"orders.read\", \"orders.write\"], \"sf_456\": [\"orders.read\"]}. The JwtAuthorize attribute can parse that and check against the current storefront context.",
        },
        {
          userId: marcus.id,
          content: "That works. I'll also need to update the Angular admin app to handle the new token format. It currently stores the token in localStorage and passes it via an HTTP interceptor — the interceptor logic should stay the same, but I need to update the token refresh flow since the new JWT has a different expiry structure.",
        },
      ],
    },
    {
      columnId: CORE_IN_PROGRESS,
      title: "Redesign product editor canvas for mobile support",
      description: "The Fabric.js editor is desktop-only. We need touch gesture support for pinch-to-zoom, two-finger rotation, and a mobile-friendly toolbar. Working with the Angular 17 editor UI.",
      priority: "MEDIUM",
      dueDate: daysFromNow(5),
      labels: ["Feature", "Enhancement"],
      assignees: [emily.id, james.id],
      comments: [
        {
          userId: emily.id,
          content:
            "Touch events are working now for basic interactions — tap to select, drag to move. Pinch-to-zoom is implemented using Hammer.js but there's a conflict with Fabric.js's built-in gesture handling. James, have you dealt with this before in the Three.js preview component?",
        },
        {
          userId: james.id,
          content:
            "Yeah, I had the same issue with Three.js OrbitControls. The trick is to disable Fabric's built-in gesture handling entirely and route all touch events through Hammer first, then translate them into Fabric canvas operations. I'll push a branch with the pattern I used — you can adapt it for the 2D canvas.",
        },
      ],
    },
    {
      columnId: CORE_IN_PROGRESS,
      title: "Optimize image processing pipeline throughput",
      description: "GraphicsMill service is bottlenecking at around 15 images/minute during peak order processing. Need to investigate parallel processing, caching of frequently-used templates, and possibly spinning up additional Azure instances.",
      priority: "HIGH",
      dueDate: daysFromNow(-2), // overdue
      labels: ["DevOps", "Enhancement"],
      assignees: [sarah.id],
      comments: [
        {
          userId: sarah.id,
          content:
            "Profiling results are in. The main bottleneck is template rendering — each image opens and re-parses the same product template PSD file. If we cache the parsed template in memory (LRU cache, max 50 templates), we can skip the PSD parsing step for 80% of requests. Initial tests show throughput jumping to ~45 images/minute.\n\nSecond optimization: we're currently processing images sequentially in the Windows service. Switching to Parallel.ForEach with MaxDegreeOfParallelism=4 should give us another 2-3x improvement.",
        },
        {
          userId: TODD_ID,
          content: "Those numbers look great. Go ahead with both optimizations. Make sure the LRU cache has a memory limit (not just count) since some of those PSD templates are 200MB+.",
        },
      ],
    },

    // Done
    {
      columnId: CORE_DONE,
      title: "Fix storefront CSS loading order on first page load",
      description: "Custom storefront CSS was loading after the page render, causing a flash of unstyled content. Fixed by inlining critical CSS and deferring non-critical styles.",
      priority: "MEDIUM",
      dueDate: daysFromNow(-7),
      labels: ["Bug"],
      assignees: [emily.id],
      comments: [
        {
          userId: emily.id,
          content: "Fixed and deployed. The FOUC is gone now. I also added a preload hint for the storefront's custom font file which shaved about 200ms off the perceived load time.",
        },
      ],
    },
    {
      columnId: CORE_DONE,
      title: "Update Stripe integration to Payment Intents API",
      description: "Migrated from the legacy Charges API to Payment Intents for SCA compliance. All payment flows now use confirm-on-server pattern.",
      priority: "HIGH",
      dueDate: daysFromNow(-14),
      labels: ["Enhancement"],
      assignees: [TODD_ID, sarah.id],
      comments: [
        {
          userId: TODD_ID,
          content: "All tests passing. Deployed to staging on Monday, ran it for a week with shadow mode logging, and everything matches. Promoted to production today.",
        },
      ],
    },
    {
      columnId: CORE_DONE,
      title: "Document API v2 endpoints with OpenAPI spec",
      description: "Generated OpenAPI 3.0 spec for all v2 endpoints. Swagger UI is now available at /api/docs for reseller integration partners.",
      priority: "LOW",
      dueDate: null,
      labels: ["Documentation"],
      assignees: [james.id],
      comments: [],
    },
  ]

  // Cards for Sales and Marketing board
  const salesCards: CardSeed[] = [
    // Todd column
    {
      columnId: SALES_TODD,
      title: "Prepare Q1 2026 pricing update proposal",
      description: "Review current pricing tiers and prepare a proposal for updated pricing that reflects the new features we've added (PDF/X-4 output, batch processing, webhooks). Need competitive analysis from at least 3 competitors.\n\nTarget: present to leadership by end of month.",
      priority: "HIGH",
      dueDate: daysFromNow(5),
      labels: [],
      assignees: [TODD_ID],
      comments: [
        {
          userId: robin.id,
          content: "I pulled pricing data from Printful, Gooten, and Printify. Spreadsheet is in the shared drive. Key takeaway: we're underpriced on our enterprise tier by about 20% but competitive on the starter plans. Want me to draft the comparison slides?",
        },
        {
          userId: TODD_ID,
          content: "Yes please! Also include a slide on the value of our white-labeling capabilities — that's where most competitors charge extra and we include it. I want to justify the price increase by showing the feature gap.",
        },
      ],
    },
    {
      columnId: SALES_TODD,
      title: "Schedule demo with Acme Corp (50+ storefronts)",
      description: "Acme Corp reached out about migrating their 50+ storefronts from a competitor platform. They want a live demo focusing on multi-tenant management, custom branding per storefront, and API integration capabilities.",
      priority: "URGENT",
      dueDate: daysFromNow(1),
      labels: ["Hot Lead"],
      assignees: [TODD_ID, robin.id],
      comments: [
        {
          userId: robin.id,
          content:
            "I've been in touch with their VP of Operations, Diana Marsh. She's available Thursday or Friday afternoon. Their biggest pain points are:\n\n1. Current platform doesn't support per-storefront custom domains\n2. They need SSO integration with Okta\n3. They want real-time order status webhooks for their ERP\n\nWe should have #1 and #3 covered. For SSO, I know it's on our roadmap — can we give them a rough timeline?",
        },
      ],
    },

    // Robin column
    {
      columnId: SALES_ROBIN,
      title: "Follow up with PrintCo on annual renewal",
      description: "PrintCo's annual contract expires March 15. They've been a customer for 3 years. Last year's renewal was $48K. They've added 12 storefronts since then (now at 35 total).",
      priority: "HIGH",
      dueDate: daysFromNow(-1), // overdue
      labels: ["Follow Up"],
      assignees: [robin.id],
      comments: [
        {
          userId: robin.id,
          content: "Left a voicemail with their procurement team yesterday. Their account manager Dan mentioned they're evaluating options but is \"very happy with the platform.\" I'll follow up again tomorrow with a renewal proposal that includes a 10% multi-year discount if they sign a 2-year term.",
        },
      ],
    },
    {
      columnId: SALES_ROBIN,
      title: "Draft partnership proposal for DesignHub integration",
      description: "DesignHub (online design tool, 2M+ users) approached us about a co-marketing partnership. They'd recommend PrintNow as their print fulfillment partner if we integrate their editor alongside our Fabric.js editor.",
      priority: "MEDIUM",
      dueDate: daysFromNow(10),
      labels: ["Partnership"],
      assignees: [robin.id, emily.id],
      comments: [
        {
          userId: emily.id,
          content: "From a technical standpoint, DesignHub uses an iframe embed with postMessage API for their editor. Integration would take about 2-3 weeks of dev time. The main challenge is mapping their design format to our print-ready PDF output — we'd need a conversion layer.",
        },
        {
          userId: robin.id,
          content: "The revenue potential here is significant. Their user base of 2M includes a lot of small businesses that currently don't have a print fulfillment solution. Even a 1% conversion rate would mean 20K new potential customers. I'll draft the business terms and have it ready for review by Friday.",
        },
      ],
    },

    // Traci column
    {
      columnId: SALES_TRACI,
      title: "Create case study: FastPrint's 300% order growth",
      description: "FastPrint grew from 200 to 800 orders/month after switching to our platform 6 months ago. This is a great success story for our enterprise marketing. Need to interview their CEO and create a 2-page case study with metrics.",
      priority: "MEDIUM",
      dueDate: daysFromNow(8),
      labels: ["Content"],
      assignees: [createdUsers[4].id], // robin taylor (repurposing as Traci's task)
      comments: [
        {
          userId: createdUsers[4].id,
          content: "Interview with FastPrint CEO is scheduled for next Tuesday at 2pm. I've drafted the questions:\n\n1. What challenges were you facing with your previous platform?\n2. What specific features drove the decision to switch?\n3. Walk us through the migration process\n4. What results have you seen since switching?\n5. What's next for FastPrint?\n\nI'll record the call and get a transcript for the case study draft.",
        },
      ],
    },
    {
      columnId: SALES_TRACI,
      title: "Plan booth for PrintExpo 2026 (March 15-17)",
      description: "We have a 10x10 booth reserved at PrintExpo in Las Vegas. Need to coordinate:\n- Booth design and signage\n- Demo stations (2 laptops running live product)\n- Promotional materials (brochures, business cards, swag)\n- Staff scheduling (need 2 people at all times)\n- Pre-event email campaign to existing leads",
      priority: "HIGH",
      dueDate: daysFromNow(12),
      labels: ["Event"],
      assignees: [robin.id, TODD_ID],
      comments: [
        {
          userId: robin.id,
          content: "I got quotes from 3 booth design vendors. Recommending BoothCraft — they can do the full design, print, and setup for $4,200 which is within our $5K booth budget. Their portfolio looks solid and they've done trade shows at the same venue before. I'll share the mockups once they're ready.",
        },
        {
          userId: TODD_ID,
          content: "Sounds good. For the demo stations, let's use our staging environment rather than production — last year we had an issue where a real order came in during a demo and it was awkward. Make sure we pre-load some impressive product templates for the live demos.",
        },
        {
          userId: emily.id,
          content: "I can prepare 5-6 really polished demo templates that show off the editor's capabilities — business cards with live 3D preview, a poster with variable data, a packaging design with spot colors, etc. I'll have them ready a week before the event.",
        },
      ],
    },

    // On Hold
    {
      columnId: SALES_ON_HOLD,
      title: "Evaluate international expansion (EU market)",
      description: "Initial research into expanding to the European market. Key considerations: GDPR compliance, VAT handling, local print fulfillment partners, multilingual support.",
      priority: "LOW",
      dueDate: null,
      labels: [],
      assignees: [TODD_ID],
      comments: [
        {
          userId: TODD_ID,
          content: "Putting this on hold until Q3. We need to nail down the TaxJar integration improvements and the PNPDF migration first. The EU expansion would require significant work on localization and tax compliance that we're not staffed for right now.",
        },
      ],
    },
  ]

  // Create all cards
  async function createCards(cards: CardSeed[], boardName: string) {
    const columnPositions: Record<string, number> = {}

    // Get existing max positions per column
    for (const card of cards) {
      if (!(card.columnId in columnPositions)) {
        const maxCard = await prisma.card.findFirst({
          where: { columnId: card.columnId },
          orderBy: { position: "desc" },
          select: { position: true },
        })
        columnPositions[card.columnId] = maxCard ? maxCard.position + 1 : 0
      }
    }

    let created = 0
    for (const cardData of cards) {
      // Skip if a card with exact same title already exists in this column
      const existing = await prisma.card.findFirst({
        where: { columnId: cardData.columnId, title: cardData.title },
      })
      if (existing) continue

      const pos = columnPositions[cardData.columnId]++
      const card = await prisma.card.create({
        data: {
          columnId: cardData.columnId,
          creatorId: TODD_ID,
          title: cardData.title,
          description: cardData.description,
          priority: cardData.priority,
          dueDate: cardData.dueDate,
          position: pos,
          assignees: {
            connect: cardData.assignees.map((id) => ({ id })),
          },
          labels: {
            connect: cardData.labels.map((name) => ({ id: labelRecords[name] })),
          },
        },
      })

      // Create comments
      for (const comment of cardData.comments) {
        await prisma.comment.create({
          data: {
            cardId: card.id,
            userId: comment.userId,
            content: comment.content,
          },
        })
      }

      created++
    }
    console.log(`  Created ${created} cards for ${boardName}`)
  }

  await createCards(coreCards, "Core Development")
  await createCards(salesCards, "Sales and Marketing")

  // ---- 4. Create a customer ----
  console.log("Creating customer...")
  const existingCustomer = await prisma.customer.findFirst({
    where: { email: "demo@acmecorp.com" },
  })
  if (!existingCustomer) {
    const customer = await prisma.customer.create({
      data: {
        organizationId: ORG_ID,
        name: "Acme Corp",
        email: "demo@acmecorp.com",
        accessCode: "ACME2026",
        boards: { connect: [{ id: CORE_BOARD_ID }] },
      },
    })
    console.log(`  Created customer: ${customer.name} (access code: ${customer.accessCode})`)

    // Add a customer comment on one of the Core Development cards
    const cardForCustomerComment = await prisma.card.findFirst({
      where: {
        columnId: CORE_IN_PROGRESS,
        title: { contains: "image processing" },
      },
    })
    if (cardForCustomerComment) {
      await prisma.comment.create({
        data: {
          cardId: cardForCustomerComment.id,
          customerId: customer.id,
          content:
            "Hi team — we've noticed the image processing slowdown on our end too. Our peak hours are between 10am-2pm EST when we're pushing through about 200 orders. Any ETA on when the throughput improvements will be live? Our fulfillment team is having to stagger order submissions to avoid timeouts.",
        },
      })
      console.log("  Added customer comment")
    }
  } else {
    console.log(`  Customer already exists: ${existingCustomer.name}`)
  }

  // ---- 5. Upload placeholder attachments ----
  console.log("Creating placeholder attachments...")

  // Create a simple text file and a small SVG as test attachments
  const testFiles = [
    {
      name: "api-integration-guide.pdf",
      content: Buffer.from("%PDF-1.4 (placeholder PDF for testing)"),
      mimeType: "application/pdf",
    },
    {
      name: "architecture-diagram.svg",
      content: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
  <rect x="10" y="10" width="120" height="60" rx="8" fill="#3b82f6" opacity="0.8"/>
  <text x="70" y="45" text-anchor="middle" fill="white" font-size="14" font-family="sans-serif">Frontend</text>
  <rect x="150" y="10" width="120" height="60" rx="8" fill="#8b5cf6" opacity="0.8"/>
  <text x="210" y="45" text-anchor="middle" fill="white" font-size="14" font-family="sans-serif">API Layer</text>
  <rect x="290" y="10" width="100" height="60" rx="8" fill="#10b981" opacity="0.8"/>
  <text x="340" y="45" text-anchor="middle" fill="white" font-size="14" font-family="sans-serif">Database</text>
  <line x1="130" y1="40" x2="150" y2="40" stroke="#666" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="270" y1="40" x2="290" y2="40" stroke="#666" stroke-width="2"/>
  <rect x="10" y="120" width="120" height="60" rx="8" fill="#f97316" opacity="0.8"/>
  <text x="70" y="155" text-anchor="middle" fill="white" font-size="14" font-family="sans-serif">Editor</text>
  <rect x="150" y="120" width="120" height="60" rx="8" fill="#ec4899" opacity="0.8"/>
  <text x="210" y="155" text-anchor="middle" fill="white" font-size="14" font-family="sans-serif">Processing</text>
  <rect x="290" y="120" width="100" height="60" rx="8" fill="#6b7280" opacity="0.8"/>
  <text x="340" y="155" text-anchor="middle" fill="white" font-size="14" font-family="sans-serif">Storage</text>
</svg>`
      ),
      mimeType: "image/svg+xml",
    },
    {
      name: "deployment-notes.txt",
      content: Buffer.from(
        `PrintNow Deployment Notes — February 2026
============================================

Pre-deployment checklist:
1. Run full test suite (unit + integration)
2. Verify database migrations are idempotent
3. Check Azure slot health endpoints
4. Confirm CDN cache invalidation rules

Rollback procedure:
- Swap staging/production slots in Azure portal
- Verify health endpoint returns 200
- Check Application Insights for error spike
- If errors persist, swap back within 5 minutes

Post-deployment:
- Monitor error rates for 30 minutes
- Verify critical user flows (login, order, payment)
- Check async job processing queue
- Notify #team-deploy Slack channel
`
      ),
      mimeType: "text/plain",
    },
  ]

  // Pick a couple of cards to attach files to
  const webhookCard = await prisma.card.findFirst({
    where: { title: { contains: "webhook system" } },
  })
  const migrationCard = await prisma.card.findFirst({
    where: { title: { contains: "JWT" } },
  })
  const pdfCard = await prisma.card.findFirst({
    where: { title: { contains: "PNPDF" } },
  })

  const attachmentTargets = [
    { card: webhookCard, file: testFiles[0] },
    { card: migrationCard, file: testFiles[1] },
    { card: migrationCard, file: testFiles[2] },
    { card: pdfCard, file: testFiles[0] },
  ]

  let attachmentsCreated = 0
  for (const { card, file } of attachmentTargets) {
    if (!card) continue

    // Check if attachment already exists
    const existing = await prisma.attachment.findFirst({
      where: { cardId: card.id, name: file.name },
    })
    if (existing) continue

    const boardId =
      card.columnId === CORE_TODO || card.columnId === CORE_IN_PROGRESS || card.columnId === CORE_DONE
        ? CORE_BOARD_ID
        : SALES_BOARD_ID

    const uniquePrefix = Math.random().toString(36).slice(2, 10)
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `${boardId}/${card.id}/${uniquePrefix}-${sanitizedName}`

    const { data, error } = await supabase.storage
      .from("attachments")
      .upload(storagePath, file.content, {
        contentType: file.mimeType,
        upsert: false,
      })

    if (error) {
      console.log(`  Failed to upload ${file.name}: ${error.message}`)
      continue
    }

    const { data: urlData } = supabase.storage
      .from("attachments")
      .getPublicUrl(data.path)

    await prisma.attachment.create({
      data: {
        cardId: card.id,
        name: file.name,
        url: urlData.publicUrl,
        storagePath: data.path,
        size: file.content.length,
        mimeType: file.mimeType,
      },
    })
    attachmentsCreated++
  }
  console.log(`  Created ${attachmentsCreated} attachments`)

  // ---- Summary ----
  console.log("\n--- Seed complete! ---")
  console.log("Team members: Todd Gordner + 5 fake users")
  console.log("Customer portal: access code ACME2026")
  console.log("Boards: Core Development, Sales and Marketing")
  console.log("")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
