/**
 * Seed script for "123 Printing Company" and "Workflow Automation AI" boards.
 * Also creates a few cards with 15-20 comment threads for navigation testing.
 *
 * Run with:  npx tsx scripts/seed-extra.ts
 */

import { readFileSync } from "fs"
import { resolve } from "path"

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
process.env.DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL

import { PrismaClient } from "@prisma/client"
import { createClient } from "@supabase/supabase-js"

const prisma = new PrismaClient()
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// --- IDs ---
const ORG_ID = "cml8uf6tu0002n8iju48yn88v"

const TODD = "cml8uf6tu0000n8ijsmp3z8oa"
const SARAH = "cmla3talv0000n8h20yzpd06k"
const MARCUS = "cmla3tatl0003n8h26mn9zhgv"
const EMILY = "cmla3tay90006n8h233j4h1ci"
const JAMES = "cmla3tb2x0009n8h2qzgspnvx"
const ROBIN = "cmla3tb7l000cn8h276l64a2s"

// Board: 123 Printing Company
const PRINTING_BOARD = "cmla3yf4v000en86yc21ho9di"
const PRINTING_TODO = "cmla3yf4v000fn86yedylqqms"
const PRINTING_IN_PROGRESS = "cmla3yf4v000gn86y5j1ncwsh"
const PRINTING_DONE = "cmla3yf4v000hn86ytexqv0v0"
const PRINTING_ON_HOLD = "cmla3yr1r000jn86y55hmwi8y"

// Board: Workflow Automation AI
const WORKFLOW_BOARD = "cmla3x3n90001n86y445gbuk9"
const WORKFLOW_TODO = "cmla3x3n90002n86y75bwzckx"
const WORKFLOW_IN_PROGRESS = "cmla3x3n90003n86ytg77alid"
const WORKFLOW_DONE = "cmla3x3n90004n86y5jtnwgss"
const WORKFLOW_ON_HOLD = "cmla3xdoi0006n86yw1yvbc53"
const WORKFLOW_COMPLETED = "cmla3xm16000an86yjsqfu0sv"

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(12, 0, 0, 0)
  return d
}

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

async function main() {
  console.log("Seeding extra boards...\n")

  // --- Add board members ---
  console.log("Adding board members...")
  const allUsers = [TODD, SARAH, MARCUS, EMILY, JAMES, ROBIN]
  for (const userId of allUsers) {
    for (const boardId of [PRINTING_BOARD, WORKFLOW_BOARD]) {
      await prisma.boardMember.upsert({
        where: { boardId_userId: { boardId, userId } },
        create: { boardId, userId },
        update: {},
      })
    }
  }

  // --- Labels ---
  console.log("Creating labels...")
  const printingLabels = [
    { name: "Equipment", color: "#f97316", boardId: PRINTING_BOARD },
    { name: "Client Work", color: "#3b82f6", boardId: PRINTING_BOARD },
    { name: "Maintenance", color: "#6b7280", boardId: PRINTING_BOARD },
    { name: "Rush Order", color: "#ef4444", boardId: PRINTING_BOARD },
    { name: "Quality", color: "#8b5cf6", boardId: PRINTING_BOARD },
    { name: "Supplies", color: "#10b981", boardId: PRINTING_BOARD },
  ]
  const workflowLabels = [
    { name: "AI/ML", color: "#8b5cf6", boardId: WORKFLOW_BOARD },
    { name: "Integration", color: "#3b82f6", boardId: WORKFLOW_BOARD },
    { name: "Automation", color: "#10b981", boardId: WORKFLOW_BOARD },
    { name: "Research", color: "#f59e0b", boardId: WORKFLOW_BOARD },
    { name: "Infrastructure", color: "#6b7280", boardId: WORKFLOW_BOARD },
    { name: "Prototype", color: "#ec4899", boardId: WORKFLOW_BOARD },
  ]

  const labelMap: Record<string, string> = {}
  for (const l of [...printingLabels, ...workflowLabels]) {
    const existing = await prisma.label.findFirst({
      where: { boardId: l.boardId, name: l.name },
    })
    if (existing) {
      labelMap[`${l.boardId}:${l.name}`] = existing.id
    } else {
      const label = await prisma.label.create({ data: l })
      labelMap[`${l.boardId}:${l.name}`] = label.id
    }
  }

  function labelIds(boardId: string, names: string[]): string[] {
    return names.map((n) => labelMap[`${boardId}:${n}`]).filter(Boolean)
  }

  // =============================================
  // 123 PRINTING COMPANY
  // =============================================
  console.log("\nCreating 123 Printing Company cards...")

  const printingCards: CardSeed[] = [
    // --- TO DO ---
    {
      columnId: PRINTING_TODO,
      title: "Order replacement printheads for HP Indigo 7900",
      description: "Print quality on the HP Indigo 7900 (unit #3) is degrading — visible banding on gradient areas. We need to order replacement printheads before it gets worse. The current heads have about 12M impressions on them which is near end of life.\n\nHP part numbers needed:\n- CA399A (Cyan/Magenta)\n- CA400A (Yellow/Black)\n\nEstimated cost: ~$8,500 per set. Lead time is usually 5-7 business days.",
      priority: "HIGH",
      dueDate: daysFromNow(3),
      labels: ["Equipment", "Maintenance"],
      assignees: [JAMES, SARAH],
      comments: [
        { userId: JAMES, content: "I called HP support — they confirmed we're eligible for the volume discount pricing since we've purchased 4+ sets this year. That brings it down to $7,200 per set. They also mentioned a new extended-life printhead that's supposed to last 15M impressions but it's $9,800." },
        { userId: SARAH, content: "Let's go with the extended-life heads. If they really last 25% longer that's a better cost-per-impression. We should also schedule a full PM while the machine is down for the swap — might as well do the fuser and transfer blanket too." },
        { userId: TODD, content: "Agreed on the extended-life heads. James, please also get a quote for a spare set so we have backup inventory. I don't want to be down for a week waiting on parts again like last quarter." },
      ],
    },
    {
      columnId: PRINTING_TODO,
      title: "Set up color management profiles for new Mohawk paper stock",
      description: "We just received samples of Mohawk Superfine Eggshell 100lb cover. Need to create ICC profiles for both the Indigo and the Ricoh before we can accept client jobs on this stock.\n\nProfileing workflow:\n1. Print i1Profiler target chart on both presses\n2. Read with spectrophotometer\n3. Generate ICC profiles\n4. Test with standard reference images\n5. Get sign-off from QC team",
      priority: "MEDIUM",
      dueDate: daysFromNow(7),
      labels: ["Quality"],
      assignees: [EMILY],
      comments: [
        { userId: EMILY, content: "Printed the target charts on both machines this morning. I'll read them with the i1Pro3 tomorrow. The eggshell texture might cause some issues with the spectro readings — I may need to take multiple measurements and average them." },
      ],
    },
    {
      columnId: PRINTING_TODO,
      title: "Inventory check — toner and substrate levels",
      description: "Monthly inventory audit. Check toner levels on all 4 digital presses, substrate inventory in warehouse, and reorder anything below our 2-week safety stock threshold.",
      priority: "LOW",
      dueDate: daysFromNow(5),
      labels: ["Supplies"],
      assignees: [ROBIN],
      comments: [],
    },
    {
      columnId: PRINTING_TODO,
      title: "Quote request: 50,000 postcards for Valley Real Estate",
      description: "Valley Real Estate Group wants 50,000 6x9 postcards, 4/4 process, 14pt C2S, UV coating one side. They need delivery within 3 weeks. This is a potential recurring monthly client — they do mailers every month.\n\nNeed to price:\n- Offset vs digital (at 50K, offset is probably cheaper)\n- Paper cost at current market rates\n- UV coating\n- Shipping to their 3 locations",
      priority: "HIGH",
      dueDate: daysFromNow(1),
      labels: ["Client Work"],
      assignees: [TODD, ROBIN],
      comments: [
        { userId: ROBIN, content: "I ran the numbers. Offset on the Heidelberg: $0.048/piece all-in including UV and cutting. Digital on the Indigo would be $0.082/piece. At 50K quantity, offset saves them $1,700. Turnaround is 7 business days for offset vs 3 for digital.\n\nFor the recurring monthly pricing, I'd suggest a 12-month contract at $0.044/piece with a guaranteed monthly minimum of 40K pieces." },
        { userId: TODD, content: "Good analysis. Present both options with the contract pricing. Emphasize the monthly contract value — lock them in for a year and we'll give them the best rate. Also mention we can do variable data on the address side if they want to personalize." },
      ],
    },
    {
      columnId: PRINTING_TODO,
      title: "Calibrate Heidelberg Speedmaster CPC ink zones",
      description: "The press operators reported inconsistent ink density across zones 4-8 on the Heidelberg Speedmaster. Need to run a full CPC calibration and check the ink duct blade gaps.",
      priority: "MEDIUM",
      dueDate: daysFromNow(2),
      labels: ["Equipment", "Maintenance"],
      assignees: [JAMES],
      comments: [],
    },

    // --- IN PROGRESS ---
    {
      columnId: PRINTING_IN_PROGRESS,
      title: "Print run: TechStart Conference program booklets (5,000 copies)",
      description: "Currently on press — TechStart Conference 2026 program booklets.\n\nSpecs:\n- 32 pages + cover, saddle-stitched\n- Cover: 100lb gloss cover, 4/4 + soft-touch laminate\n- Text: 80lb gloss text, 4/4\n- Quantity: 5,000\n- Due: Friday pickup\n\nWe're printing the covers today, text pages tomorrow, binding Wednesday.",
      priority: "URGENT",
      dueDate: daysFromNow(0),
      labels: ["Client Work", "Rush Order"],
      assignees: [MARCUS, JAMES],
      comments: [
        { userId: MARCUS, content: "Cover sheets are done — 5,200 printed (including overs). Color looks great, client-approved proof match is within Delta E 2.0 on all pages. Moving to soft-touch lamination now." },
        { userId: JAMES, content: "Text pages are on the Indigo now. Pages 1-16 are done. I noticed the client's supplied PDF for pages 22-23 has an RGB image that's converting to CMYK with a noticeable color shift on the sky gradient. Should I flag this or print as-is?" },
        { userId: TODD, content: "Flag it. Send the client a screenshot comparison showing the RGB vs CMYK conversion. Better to catch it now than have them reject the whole run. We have time since binding isn't until Wednesday." },
        { userId: JAMES, content: "Client responded — they sent an updated PDF with the corrected CMYK image. Reprinting pages 17-24 signature now. Should only add about 45 minutes." },
      ],
    },
    {
      columnId: PRINTING_IN_PROGRESS,
      title: "Install and configure new Duplo DC-646 cutter/creaser",
      description: "The new Duplo DC-646 arrived last week. It's assembled and powered up, but we need to:\n1. Run the initial calibration routine\n2. Set up common cut/crease patterns (business cards, tri-folds, etc.)\n3. Test accuracy with our standard substrates\n4. Train operators\n5. Integrate with our Fiery workflow for automated job setup",
      priority: "HIGH",
      dueDate: daysFromNow(4),
      labels: ["Equipment"],
      assignees: [SARAH, EMILY],
      comments: [
        { userId: SARAH, content: "Calibration is done. Accuracy is within 0.3mm across all zones which is better than the spec sheet. I've programmed 8 standard patterns so far — business cards (3.5x2, 2x3.5), letter tri-fold, A4 tri-fold, and 4-up postcard layouts." },
        { userId: EMILY, content: "I'm working on the Fiery integration. The Duplo supports JDF job tickets so in theory we can automate the cut pattern selection based on the job metadata. I've got it working for simple business card jobs — the operator just loads the sheet and it auto-detects the pattern." },
      ],
    },

    // --- This card gets the LONG comment thread (15+ messages) ---
    {
      columnId: PRINTING_IN_PROGRESS,
      title: "Resolve print quality issues on Garcia Wedding invitation suite",
      description: "High-profile client — Garcia/Mitchell wedding, 200 invitation suites. Premium job with foil stamping, letterpress, and digital elements. Quality issues on the first proof run:\n\n- Foil registration is off by ~1mm on the monogram\n- Letterpress impression depth is inconsistent across the sheet\n- Digital RSVP card colors don't match the pantone reference (PMS 7621 looks too orange)\n\nClient is the wedding planner for a local celebrity couple — this needs to be perfect.",
      priority: "URGENT",
      dueDate: daysFromNow(-1),
      labels: ["Client Work", "Quality", "Rush Order"],
      assignees: [TODD, EMILY, MARCUS],
      comments: [
        { userId: EMILY, content: "I checked the foil stamping die alignment. The die itself is cut correctly but the registration pins on the Kluge are worn — they're allowing about 1mm of play. I shimmed them temporarily to tighten the registration. Running a test sheet now." },
        { userId: MARCUS, content: "For the letterpress impression issue — I found the problem. The tympan packing was uneven. The previous job used a thicker stock so the packing was adjusted down, and whoever set up this job didn't readjust. I've re-packed with fresh tympan and calibration sheets. Test impression looks much more consistent now." },
        { userId: TODD, content: "Good catches on both. Emily, how's the foil registration looking after the shim fix? And Marcus, can you run 5 test sheets at different pressures so we can pick the ideal impression depth with the client?" },
        { userId: EMILY, content: "Foil registration is now within 0.2mm which is within industry standard. I ran 10 test sheets and they're all consistent. The gold foil on cream Lettra stock looks gorgeous. Sending photos to the group chat." },
        { userId: MARCUS, content: "Here are the 5 pressure levels. I labeled them A through E, lightest to deepest impression. Personally I think C or D look best — C is a classic light kiss impression, D has more of that deep tactile feel that's trending in luxury invitations right now." },
        { userId: TODD, content: "These look great. I'm leaning toward D as well. Let me send photos to the wedding planner for her input before we commit. Meanwhile, Emily, can you tackle the PMS 7621 color match issue on the digital RSVP cards?" },
        { userId: EMILY, content: "Looking into the PMS 7621 issue now. I pulled the Pantone bridge book and measured our print against it. We're off by Delta E 5.2 — definitely noticeable. The issue is our ICC profile is optimized for coated stock and these RSVPs are on uncoated Crane Lettra.\n\nI need to create a custom profile for Lettra or manually adjust the CMYK recipe. The standard Pantone-to-CMYK conversion for 7621 on uncoated is C:0 M:79 Y:89 K:18 but I think we need to bump the magenta to compensate for the warm paper base." },
        { userId: TODD, content: "Good diagnosis. Wedding planner just responded — she loves impression level D. She said \"that's exactly the look we discussed.\" So we're locked on foil and letterpress. Let's get the color nailed down and we can start the production run." },
        { userId: EMILY, content: "Adjusted the recipe to C:2 M:84 Y:87 K:20 and it's much closer. Delta E is now 1.8 against the Pantone swatch. I also printed it next to the foil-stamped invitation piece and they complement each other well — the slightly richer red actually looks better against the gold foil than a perfect PMS match would." },
        { userId: MARCUS, content: "I just compared the RSVP card next to the envelope liner (which was printed last week on the same stock) and they're a near-perfect visual match. The Delta E between the two prints is 0.6 which is imperceptible to the human eye." },
        { userId: TODD, content: "Excellent work, both of you. Let's get client sign-off. I'm putting together a complete proof package:\n\n1. Invitation with foil monogram and letterpress text\n2. RSVP card with corrected color\n3. Envelope with liner\n4. All assembled in the pocket folder\n\nI'll hand-deliver it to the wedding planner this afternoon." },
        { userId: EMILY, content: "One more thing — the envelope addressing. They want digital calligraphy printed on the envelopes. I tested on the Ricoh and the registration on A7 envelopes is tricky because of the flap thickness causing feeding issues. The HP Indigo handles them better with the thick media tray. Should I run the envelopes on the Indigo instead?" },
        { userId: TODD, content: "Yes, use the Indigo for envelopes. Better to use the more reliable feeding than risk smeared envelopes. Make sure to test both the outer envelope and the inner envelope (they're different sizes)." },
        { userId: EMILY, content: "Tested both envelope sizes on the Indigo — feeding is perfect. The digital calligraphy font renders beautifully at 1200 dpi. I loaded the guest list CSV and did a test merge with 10 addresses. All look good. Ready for production whenever we get the go-ahead." },
        { userId: TODD, content: "Wedding planner LOVED the proof package. Direct quote: \"This is the most beautiful invitation suite I've ever seen.\" We are approved for production. She did request one small change — can we add a small gold foil heart below the monogram on the invitation? About 5mm. I told her we'd check if the die can be modified." },
        { userId: MARCUS, content: "I called the die maker — they can modify the existing die to add the heart element. $85 rush charge, ready tomorrow morning. Alternatively, we could do a second pass with a separate heart die for $45 but that adds registration risk." },
        { userId: TODD, content: "Go with the die modification for $85. Not worth the registration risk on a job this important. Let's plan to start production Thursday. Full schedule:\n\n- Thursday AM: Foil stamping (modified die)\n- Thursday PM: Letterpress text\n- Friday AM: RSVP cards + detail cards on Indigo\n- Friday PM: Envelope addressing on Indigo\n- Monday: Assembly and quality check\n- Tuesday: Delivery\n\nMarcus, you own the press schedule. Emily, you own digital output and QC." },
        { userId: EMILY, content: "Got it. I'll prep all the digital files tonight and have them RIPped and ready in the Fiery queue. I'll also set up a QC station with the approved proof so we can compare production sheets in real-time." },
        { userId: MARCUS, content: "Press schedule is locked. I've blocked the Kluge for Thursday full day and reserved the Indigo for Friday. Backup plan if we have any issues: Saturday overtime is available if needed, but I don't think we'll need it." },
      ],
    },
    {
      columnId: PRINTING_IN_PROGRESS,
      title: "Monthly press maintenance — February schedule",
      description: "February preventive maintenance cycle for all presses:\n- HP Indigo 7900 (x2): Monthly PM per HP schedule\n- Ricoh Pro C9200: Drum cleaning and calibration\n- Heidelberg Speedmaster: Roller wash, blanket replacement zone 3",
      priority: "MEDIUM",
      dueDate: daysFromNow(6),
      labels: ["Maintenance", "Equipment"],
      assignees: [JAMES],
      comments: [
        { userId: JAMES, content: "Indigo #1 PM is done. Replaced the imaging oil filter and ran the full calibration cycle. All stations are within spec. Indigo #2 is scheduled for tomorrow." },
      ],
    },

    // --- DONE ---
    {
      columnId: PRINTING_DONE,
      title: "Complete Riverside Medical annual report print run",
      description: "10,000 copies of the Riverside Medical Center annual report. 48 pages + cover, perfect bound, 4/4 throughout.",
      priority: "HIGH",
      dueDate: daysFromNow(-5),
      labels: ["Client Work"],
      assignees: [MARCUS, ROBIN],
      comments: [
        { userId: MARCUS, content: "All 10,000 copies printed, bound, and boxed. Shrink-wrapped in cartons of 50. Ready for pickup." },
        { userId: ROBIN, content: "Client picked up today. They were very happy with the quality. They mentioned they'll need the same report in Spanish — that could be another 5,000 copy run in March." },
      ],
    },
    {
      columnId: PRINTING_DONE,
      title: "Replace water filtration system on Heidelberg dampening unit",
      description: "The IPA-free dampening system was showing pH drift. Replaced the filtration cartridge and recalibrated conductivity sensors.",
      priority: "MEDIUM",
      dueDate: daysFromNow(-10),
      labels: ["Maintenance"],
      assignees: [JAMES],
      comments: [
        { userId: JAMES, content: "Filtration system replaced. pH is now stable at 4.8-5.0 and conductivity is holding at 1200-1300 µS. Dampening is running much more consistently — the operators noticed the difference immediately." },
      ],
    },

    // --- ON HOLD ---
    {
      columnId: PRINTING_ON_HOLD,
      title: "Evaluate large format printer purchase (Canon Colorado 1650)",
      description: "We've been outsourcing all large format work (banners, posters, POP displays). At current volume (~$4K/month outsourced), a Canon Colorado 1650 ($185K) would pay for itself in about 4 years, but would also let us offer faster turnaround and capture more large format business.\n\nNeed to build a full business case with 3-year and 5-year ROI projections.",
      priority: "LOW",
      dueDate: null,
      labels: ["Equipment"],
      assignees: [TODD],
      comments: [
        { userId: TODD, content: "Putting this on hold until Q3. Our current outsource partner is reliable and margins are acceptable. Revisit after we see if the large format volume grows with the new marketing push." },
      ],
    },
    {
      columnId: PRINTING_ON_HOLD,
      title: "Automate job ticketing from web-to-print portal",
      description: "Currently, orders from the PrintNow web-to-print portal are manually entered into our MIS (Presswise). Investigate automating this via the PrintNow API + Presswise integration.",
      priority: "MEDIUM",
      dueDate: null,
      labels: ["Client Work"],
      assignees: [SARAH],
      comments: [
        { userId: SARAH, content: "I spoke with the PrintNow team about their API capabilities. They support webhooks for order events and have a REST API that can push order details including the print-ready PDF URLs. On the Presswise side, they have an import API but it's XML-based and poorly documented. Waiting on their support team to send updated docs before we can proceed." },
      ],
    },
  ]

  // =============================================
  // WORKFLOW AUTOMATION AI
  // =============================================
  console.log("Creating Workflow Automation AI cards...")

  const workflowCards: CardSeed[] = [
    // --- TO DO ---
    {
      columnId: WORKFLOW_TODO,
      title: "Design prompt engineering framework for order classification",
      description: "Build a reusable prompt framework that can classify incoming print orders by:\n- Product type (business cards, brochures, postcards, banners, etc.)\n- Complexity (simple 4/4 process vs. special finishes, variable data, etc.)\n- Urgency (standard, rush, same-day)\n- Estimated production time\n\nThis will feed into the automated scheduling system. Need to evaluate GPT-4o vs Claude for accuracy and cost at our volume (~500 orders/day).",
      priority: "HIGH",
      dueDate: daysFromNow(10),
      labels: ["AI/ML", "Research"],
      assignees: [SARAH, TODD],
      comments: [
        { userId: SARAH, content: "I've drafted an initial prompt template and tested it against 100 historical orders. Results:\n\n- Product type classification: 96% accuracy\n- Complexity scoring: 88% accuracy\n- Urgency detection: 94% accuracy\n\nThe complexity scoring struggles with edge cases like die-cut shapes and spot UV patterns. I think we need to add more examples to the few-shot prompt for those categories." },
        { userId: TODD, content: "96% on product type is solid. For complexity scoring, can we add a confidence threshold? If the model is <80% confident, flag it for human review rather than auto-classifying. That way we catch the edge cases without slowing down the 88% that are clear-cut." },
      ],
    },
    {
      columnId: WORKFLOW_TODO,
      title: "Build automated preflight check pipeline",
      description: "Create an automated preflight system that checks submitted print files for:\n- Resolution (minimum 300 DPI at print size)\n- Color space (CMYK required, flag RGB)\n- Bleed (minimum 0.125\" on all sides)\n- Font embedding (all fonts must be embedded or outlined)\n- File format validation (PDF/X-4 preferred)\n\nShould run automatically when a file is uploaded through the web-to-print portal and notify the customer of any issues within 60 seconds.",
      priority: "MEDIUM",
      dueDate: daysFromNow(14),
      labels: ["Automation"],
      assignees: [JAMES, MARCUS],
      comments: [
        { userId: JAMES, content: "I've evaluated three approaches:\n\n1. **GhostScript-based**: Parse PDF with GS, extract metadata. Fast but limited checking.\n2. **callas pdfToolbox API**: Industry-standard preflight, comprehensive but $$$.\n3. **Custom with PNPDF + our GS service**: Use PNPDF to parse structure, GS for rasterization checks.\n\nRecommending option 3 since we already have both components. We can build the pipeline as an Azure Function that triggers on blob upload." },
      ],
    },
    {
      columnId: WORKFLOW_TODO,
      title: "Create AI-powered customer service chatbot for order status",
      description: "Customers frequently contact support asking about order status, delivery estimates, and reorder history. Build a chatbot that can:\n\n1. Look up order status by order number or customer email\n2. Provide estimated delivery dates based on current production schedule\n3. Help with reorders (pull up previous order details)\n4. Escalate to human agent when needed\n\nIntegrate with our existing Presswise MIS for real-time order data.",
      priority: "LOW",
      dueDate: daysFromNow(30),
      labels: ["AI/ML", "Integration"],
      assignees: [EMILY],
      comments: [],
    },
    {
      columnId: WORKFLOW_TODO,
      title: "Implement automated ink coverage calculation for quoting",
      description: "Currently, estimators manually eyeball ink coverage to calculate toner/ink costs for quotes. Build a system that:\n- Accepts a PDF upload\n- Rasterizes each page\n- Calculates CMYK coverage percentages per page\n- Outputs average and peak coverage for cost estimation\n\nThis would speed up quoting from 15 minutes to under 1 minute for standard jobs.",
      priority: "MEDIUM",
      dueDate: daysFromNow(21),
      labels: ["Automation"],
      assignees: [JAMES],
      comments: [
        { userId: JAMES, content: "I prototyped this using GhostScript's ink coverage device (`-sDEVICE=inkcov`). It works well for single-page files but our remote GS service currently only handles one page at a time. I'll need to modify the API to accept multi-page PDFs and return per-page coverage data." },
      ],
    },

    // --- IN PROGRESS ---
    {
      columnId: WORKFLOW_IN_PROGRESS,
      title: "Build smart production scheduling algorithm",
      description: "Replace the current manual scheduling spreadsheet with an AI-powered scheduling system. The algorithm should consider:\n\n- Machine availability and capabilities\n- Job priority and due dates\n- Setup time between jobs (minimize changeovers)\n- Operator skill levels\n- Substrate availability\n- Press maintenance windows\n\nGoal: Reduce production scheduling time from 2 hours/day to 15 minutes with better machine utilization.",
      priority: "HIGH",
      dueDate: daysFromNow(3),
      labels: ["AI/ML", "Automation"],
      assignees: [SARAH, TODD],
      comments: [
        { userId: SARAH, content: "I've modeled this as a constraint satisfaction problem with optimization. The core variables are:\n\n- **Jobs**: Each with duration, machine compatibility, priority, due date\n- **Machines**: Each with availability windows and capability set\n- **Changeover matrix**: Time to switch between job types on each machine\n\nUsing Google OR-Tools for the solver. Initial prototype can schedule 50 jobs across 4 machines in about 3 seconds." },
        { userId: TODD, content: "3 seconds is great. What about the real-time rescheduling scenario? When a rush job comes in at 2pm, can it re-optimize the remaining schedule without disrupting jobs already on press?" },
        { userId: SARAH, content: "Yes — I've added a \"locked\" flag for jobs currently in production. The solver treats those as fixed constraints and only optimizes the remaining unstarted jobs. Rescheduling 30 remaining jobs with a new rush insertion takes about 1.5 seconds." },
        { userId: MARCUS, content: "From the press operator perspective — will this show us the schedule on a screen by the press? Right now we have to walk over to the scheduling office to check the whiteboard. A live dashboard would save a ton of time." },
        { userId: SARAH, content: "That's the plan. The scheduling output will feed into a real-time dashboard (thinking a TV mounted in the production area). Each machine gets a column showing the current job, next 3 upcoming jobs, and estimated completion times. Operators can also flag issues (machine down, job delay) directly from the dashboard." },
      ],
    },
    // --- This card gets a LONG comment thread (20 messages) ---
    {
      columnId: WORKFLOW_IN_PROGRESS,
      title: "Integrate PrintNow web-to-print orders with automated production pipeline",
      description: "The holy grail project — connect the entire chain from web-to-print order submission through automated preflight, scheduling, and production. When a customer submits an order on a PrintNow storefront, it should:\n\n1. Auto-preflight the submitted files\n2. Classify the job type and complexity\n3. Generate an optimized imposition layout\n4. Schedule onto the appropriate press\n5. Generate a job ticket for the press operator\n6. Track production progress and update order status\n\nThis is a multi-month initiative. Currently focused on steps 1-3.",
      priority: "URGENT",
      dueDate: daysFromNow(0),
      labels: ["Integration", "Automation", "AI/ML"],
      assignees: [TODD, SARAH, JAMES],
      comments: [
        { userId: TODD, content: "Alright team, let's break down the current state of each component and figure out what's blocking the end-to-end integration. I know we've been working on pieces independently — time to connect the dots." },
        { userId: SARAH, content: "Here's where we stand on each step:\n\n1. **Preflight**: James has the GhostScript-based checker working. It catches resolution, color space, and bleed issues. Runs in about 8 seconds per file.\n2. **Classification**: My prompt framework is at 94% accuracy overall. Ready for integration.\n3. **Imposition**: Not started. This is the biggest gap.\n4. **Scheduling**: Solver works, just needs the input feed connected.\n5. **Job ticket**: Template exists, needs automated population.\n6. **Status tracking**: PrintNow API webhooks can handle this." },
        { userId: JAMES, content: "For imposition — I've been researching automated imposition tools. The main challenge is that imposition layouts depend on the finishing method (saddle-stitch, perfect bind, tri-fold, etc.) and the press sheet size. We'd need a rules engine that maps product type → imposition template.\n\nFor standard products like business cards and postcards, it's straightforward — they always impose the same way. For booklets, it gets complex because of page ordering, creep compensation, and signature planning." },
        { userId: TODD, content: "Let's start with the standard products (business cards, postcards, flyers, brochures). Those represent about 70% of our volume. Booklets and complex products can stay manual for now.\n\nJames, how many standard imposition templates would we need to cover those products?" },
        { userId: JAMES, content: "For the 70% coverage target, we'd need about 15 templates:\n\n- Business cards: 2 layouts (10-up portrait, 10-up landscape)\n- Postcards: 3 sizes (4x6, 5x7, 6x9) × 2 orientations = 4 layouts (some share)\n- Flyers: 3 sizes (letter, tabloid, A4) \n- Brochures: 3 fold types (tri-fold, z-fold, bi-fold)\n\nEach template is basically a PDF with marked zones for content placement, crop marks, and fold lines. I can create them in our imposition software and export the coordinates as JSON for the automation system." },
        { userId: SARAH, content: "That's manageable. Once James defines the template JSON format, I can update the classification system to also output the recommended template ID. So the flow becomes:\n\nOrder → Classification (outputs: product_type, complexity, template_id) → Imposition (uses template_id to place content) → Scheduling" },
        { userId: TODD, content: "Perfect. Let's set a target of having the business card flow fully automated end-to-end first. Business cards are our highest volume single product (about 200 orders/day) and they're the simplest to automate. Once that works, we expand to postcards, then flyers, then brochures." },
        { userId: JAMES, content: "Business card imposition template is done. I've defined it as a JSON structure:\n\n```json\n{\n  \"templateId\": \"BC-10UP-P\",\n  \"sheetSize\": [12, 18],\n  \"bleed\": 0.125,\n  \"slots\": 10,\n  \"layout\": \"2x5\",\n  \"cutMarks\": true\n}\n```\n\nThe imposition engine reads this and uses PNPDF to merge the customer's business card PDF into the 10-up layout. Processing time is about 2 seconds per sheet." },
        { userId: SARAH, content: "I've updated the classifier to handle business cards specifically. It now detects:\n- Standard vs. folded business cards\n- Portrait vs. landscape orientation\n- Single-sided vs. duplex\n- Special finishes mentioned in order notes (spot UV, foil, rounded corners)\n\nAccuracy on business card classification specifically is 99.1% — only failure case so far is when customers upload a postcard-sized file but order business cards." },
        { userId: TODD, content: "99.1% is excellent. For the edge cases, let's add a dimensional check — if the uploaded file dimensions don't match standard business card sizes (3.5x2 or 2x3.5 with bleed), flag for human review. That should catch the postcard-as-business-card scenario." },
        { userId: JAMES, content: "Good idea. I've added the dimension check to the preflight step. It now validates:\n1. File dimensions match the ordered product size (within ±0.25\")\n2. If dimensions are off, it checks if the content could be auto-scaled\n3. If scaling would exceed 5%, it flags for review\n\nThis catches about 3% of orders that have sizing issues. Most are minor and auto-fixable." },
        { userId: SARAH, content: "I connected the classification output to the scheduling solver today. When a business card order comes in, the full automated flow now runs:\n\nPreflight (8s) → Classify (2s) → Impose (2s) → Schedule (1.5s)\n\nTotal: ~14 seconds from order submission to scheduled production. The scheduling solver automatically slots it into the next available window on the Indigo press." },
        { userId: TODD, content: "14 seconds is incredible compared to the current process which takes 30-45 minutes of human time per order. Let's run a shadow test — process the next 50 business card orders through both the automated pipeline AND the manual process. Compare the results to make sure the automation is making the same decisions a human would." },
        { userId: MARCUS, content: "From the production floor perspective — I like this a lot. One concern: will the automated scheduling respect our \"gang run\" batching? Right now we batch business cards from multiple orders onto the same press sheet to minimize waste. If each order gets its own imposition, we'll burn through a lot more paper." },
        { userId: SARAH, content: "Great point Marcus. I didn't account for gang running in the current implementation. We'd need to add a batching step between imposition and scheduling:\n\n1. Orders queue up in a batch buffer\n2. Every 30 minutes (or when buffer hits 10 orders), the system creates optimal gang run layouts\n3. Multiple customers' business cards get imposed on the same sheet\n4. That gang sheet gets scheduled as a single production job\n\nThis is more complex but the paper savings are significant. At 200 orders/day, gang running typically saves 40-60% on substrate." },
        { userId: TODD, content: "Gang running is essential — we can't skip it. Sarah, can you prioritize adding the batching logic? James, the imposition engine needs to handle multi-order gang layouts.\n\nFor the shadow test, let's still proceed with single-order imposition for now just to validate the other steps. We'll layer in gang running as the next phase." },
        { userId: JAMES, content: "I've updated the imposition engine to support gang layouts. It now accepts an array of orders and optimizes their placement on the press sheet to minimize waste. The algorithm uses a 2D bin-packing approach — it can fit up to 12 different business card designs on a single 12x18 sheet.\n\nEach card position gets a unique cut mark and a small job ID printed in the trim area so the finishing team knows which cards belong to which order." },
        { userId: SARAH, content: "Shadow test results are in from the first 50 orders:\n\n- **Preflight**: 48/50 matched human decisions. 2 orders had edge-case bleed issues that the human caught visually but our pixel-based check missed. I'll tighten the bleed detection threshold.\n- **Classification**: 50/50 matched. Perfect score.\n- **Scheduling**: 47/50 matched. The 3 differences were scheduling optimization — our algorithm actually found better machine assignments than the human scheduler (less changeover time).\n\nOverall: 97% match rate with the human process, and arguably better in some cases." },
        { userId: TODD, content: "Incredible results. Let's fix the 2 preflight edge cases and then I want to start a live pilot — run 20% of business card orders through the automated pipeline for real (not shadow). The other 80% stay manual as fallback.\n\nIf the pilot runs clean for 2 weeks, we ramp to 50%, then 100%. Target: fully automated business card production by end of March." },
        { userId: SARAH, content: "Sounds like a solid rollout plan. I'll fix the bleed detection issue today and we can start the 20% pilot tomorrow. I'm also setting up monitoring dashboards so we can track automation success rate, processing time, and any human override events in real-time.\n\nOne more thing — should we notify customers when their order was processed by the automated system? Or just let it be invisible?" },
        { userId: TODD, content: "Keep it invisible for now. The customer doesn't need to know whether a human or a robot processed their order — they just care that it's accurate and on time. We can add a \"lightning fast processing\" marketing message later once we're confident in the system.\n\nGreat work team. This is going to be a game-changer for our throughput." },
      ],
    },
    {
      columnId: WORKFLOW_IN_PROGRESS,
      title: "Train image recognition model for print defect detection",
      description: "Build a vision model that can analyze press sheet photos (from an inline camera) and detect common print defects:\n- Streaking / banding\n- Hickeys (ink spots)\n- Registration errors\n- Color shifts\n- Missing content\n\nUsing transfer learning on a pre-trained vision model fine-tuned with our historical defect photos.",
      priority: "MEDIUM",
      dueDate: daysFromNow(18),
      labels: ["AI/ML", "Research"],
      assignees: [EMILY],
      comments: [
        { userId: EMILY, content: "I've collected 2,400 labeled images from our QC team's historical defect log. Breakdown:\n- Streaking: 420 images\n- Hickeys: 380 images\n- Registration errors: 520 images\n- Color shifts: 480 images\n- Good (no defect): 600 images\n\nStarting with a fine-tuned CLIP model. Initial accuracy on a held-out test set: 87%. The model struggles most with subtle color shifts vs normal variation." },
        { userId: SARAH, content: "87% is a good start. For color shift detection specifically, you might get better results with a dedicated color analysis step rather than relying on the vision model. Extract the dominant colors per region and compare against the reference — that's more deterministic than a learned approach for color accuracy." },
        { userId: EMILY, content: "Good suggestion. I'll implement a hybrid approach — vision model for structural defects (streaking, hickeys, registration) and a colorimetric analysis for color shifts. That should get us above 93% overall." },
      ],
    },

    // --- DONE ---
    {
      columnId: WORKFLOW_DONE,
      title: "Set up Azure Functions for async file processing",
      description: "Deployed Azure Functions infrastructure for handling async file processing tasks — preflight, imposition, and PDF optimization. Using a consumption plan with blob trigger bindings.",
      priority: "MEDIUM",
      dueDate: daysFromNow(-8),
      labels: ["Infrastructure"],
      assignees: [MARCUS],
      comments: [
        { userId: MARCUS, content: "Infrastructure is live. Three functions deployed:\n- `preflight-check`: Blob trigger on upload container, runs GhostScript analysis\n- `impose-job`: Queue trigger from scheduler, generates imposed press sheets\n- `optimize-pdf`: HTTP trigger for on-demand PDF optimization\n\nCold start is about 3 seconds, warm execution is under 500ms for preflight." },
      ],
    },
    {
      columnId: WORKFLOW_DONE,
      title: "Proof of concept: GPT-4o for parsing customer email orders",
      description: "Some customers still email orders as free-text. Tested GPT-4o's ability to extract structured order data (product, quantity, size, stock, finish, delivery date) from email text. Results were promising — 91% extraction accuracy on a test set of 200 emails.",
      priority: "LOW",
      dueDate: daysFromNow(-15),
      labels: ["AI/ML", "Prototype"],
      assignees: [SARAH],
      comments: [
        { userId: SARAH, content: "POC complete. The model handles standard orders well but struggles with:\n- Orders referencing previous jobs (\"same as last time\")\n- Ambiguous quantities (\"a few thousand\" = ??)\n- Industry jargon variations (\"4-over-4\" vs \"4/4\" vs \"full color both sides\")\n\nI added a jargon normalization step that maps common variations to standard terms, which bumped accuracy to 94%. Filed the findings for future implementation." },
      ],
    },

    // --- ON HOLD ---
    {
      columnId: WORKFLOW_ON_HOLD,
      title: "Evaluate computer vision for automated color bar reading",
      description: "Research using a camera + CV to read color bars on printed sheets in real-time, replacing manual densitometer readings. Would enable closed-loop color control on the Heidelberg.",
      priority: "LOW",
      dueDate: null,
      labels: ["Research", "AI/ML"],
      assignees: [EMILY],
      comments: [
        { userId: EMILY, content: "Initial research is done. The main challenge is camera calibration — consumer cameras don't have the spectral accuracy of a densitometer. Some papers suggest using a calibrated color checker in-frame to normalize camera readings. Parking this until we finish the defect detection project since it shares some of the same camera infrastructure." },
      ],
    },

    // --- COMPLETED ---
    {
      columnId: WORKFLOW_COMPLETED,
      title: "Automate daily production report generation",
      description: "Built an automated system that pulls production data from Presswise at end of day and generates a summary report: jobs completed, press utilization %, waste %, on-time delivery rate. Emailed to management team at 6 PM daily.",
      priority: "MEDIUM",
      dueDate: daysFromNow(-20),
      labels: ["Automation"],
      assignees: [MARCUS],
      comments: [
        { userId: MARCUS, content: "Running in production for 3 weeks now. Reports have been accurate and the management team finds them very useful. Added a week-over-week comparison chart in the latest update." },
      ],
    },
    {
      columnId: WORKFLOW_COMPLETED,
      title: "Set up Supabase Realtime for production dashboard updates",
      description: "Configured Supabase Realtime subscriptions so the production floor dashboard updates instantly when job statuses change, without polling.",
      priority: "LOW",
      dueDate: daysFromNow(-12),
      labels: ["Infrastructure"],
      assignees: [JAMES],
      comments: [
        { userId: JAMES, content: "Realtime is working great. Dashboard latency from status change to display update is under 200ms. The press operators love seeing the schedule update in real-time when rush jobs get inserted." },
      ],
    },
  ]

  // --- Create cards helper ---
  async function createCards(cards: CardSeed[], boardId: string, boardName: string) {
    const columnPositions: Record<string, number> = {}

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
      const existing = await prisma.card.findFirst({
        where: { columnId: cardData.columnId, title: cardData.title },
      })
      if (existing) continue

      const pos = columnPositions[cardData.columnId]++
      const card = await prisma.card.create({
        data: {
          columnId: cardData.columnId,
          creatorId: TODD,
          title: cardData.title,
          description: cardData.description,
          priority: cardData.priority,
          dueDate: cardData.dueDate,
          position: pos,
          assignees: {
            connect: cardData.assignees.map((id) => ({ id })),
          },
          labels: {
            connect: cardData.labels.map((name) => ({
              id: labelMap[`${boardId}:${name}`],
            })),
          },
        },
      })

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

  await createCards(printingCards, PRINTING_BOARD, "123 Printing Company")
  await createCards(workflowCards, WORKFLOW_BOARD, "Workflow Automation AI")

  // --- Create a customer for 123 Printing ---
  console.log("\nCreating customer for 123 Printing Company...")
  const existingCustomer = await prisma.customer.findFirst({
    where: { email: "ops@123printing.com" },
  })
  if (!existingCustomer) {
    const customer = await prisma.customer.create({
      data: {
        organizationId: ORG_ID,
        name: "123 Printing Ops Team",
        email: "ops@123printing.com",
        accessCode: "PRINT123",
        boards: { connect: [{ id: PRINTING_BOARD }] },
      },
    })
    console.log(`  Created customer: ${customer.name} (access code: ${customer.accessCode})`)

    // Add a customer comment on the Garcia Wedding card
    const weddingCard = await prisma.card.findFirst({
      where: { title: { contains: "Garcia Wedding" } },
    })
    if (weddingCard) {
      await prisma.comment.create({
        data: {
          cardId: weddingCard.id,
          customerId: customer.id,
          content: "Hi team — the wedding planner just called and asked if we can add 25 extra invitation suites for some last-minute additions to the guest list. Same specs. Is this possible given the current timeline? She said she'd pay rush charges if needed.",
        },
      })
      console.log("  Added customer comment on Garcia Wedding card")
    }
  } else {
    console.log(`  Customer already exists: ${existingCustomer.name}`)
  }

  // --- Upload a few attachments ---
  console.log("\nCreating attachments...")
  const scheduleCard = await prisma.card.findFirst({
    where: { title: { contains: "smart production scheduling" } },
  })
  const integrationCard = await prisma.card.findFirst({
    where: { title: { contains: "PrintNow web-to-print orders" } },
  })
  const weddingCard = await prisma.card.findFirst({
    where: { title: { contains: "Garcia Wedding" } },
  })

  const testFiles = [
    {
      name: "scheduling-algorithm-spec.md",
      content: Buffer.from(
        `# Production Scheduling Algorithm Specification\n\n## Overview\nConstraint satisfaction + optimization approach using Google OR-Tools.\n\n## Variables\n- Jobs: duration, machine compatibility, priority, due date\n- Machines: availability windows, capability set\n- Changeover matrix: time to switch between job types\n\n## Constraints\n- No machine double-booking\n- Due date respect (soft constraint with penalty)\n- Operator skill matching\n- Maintenance window avoidance\n\n## Objective\nMinimize: weighted sum of (makespan + late penalties + changeover time)\n`
      ),
      mimeType: "text/markdown",
      card: scheduleCard,
      boardId: WORKFLOW_BOARD,
    },
    {
      name: "integration-architecture.svg",
      content: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
  <rect x="20" y="20" width="140" height="50" rx="8" fill="#3b82f6"/>
  <text x="90" y="50" text-anchor="middle" fill="white" font-size="13" font-family="sans-serif">PrintNow Portal</text>
  <rect x="20" y="120" width="140" height="50" rx="8" fill="#8b5cf6"/>
  <text x="90" y="150" text-anchor="middle" fill="white" font-size="13" font-family="sans-serif">Preflight Service</text>
  <rect x="220" y="120" width="140" height="50" rx="8" fill="#10b981"/>
  <text x="290" y="150" text-anchor="middle" fill="white" font-size="13" font-family="sans-serif">Classifier (AI)</text>
  <rect x="420" y="120" width="140" height="50" rx="8" fill="#f97316"/>
  <text x="490" y="150" text-anchor="middle" fill="white" font-size="13" font-family="sans-serif">Imposition Engine</text>
  <rect x="220" y="230" width="140" height="50" rx="8" fill="#ec4899"/>
  <text x="290" y="260" text-anchor="middle" fill="white" font-size="13" font-family="sans-serif">Scheduler</text>
  <rect x="420" y="230" width="140" height="50" rx="8" fill="#6b7280"/>
  <text x="490" y="260" text-anchor="middle" fill="white" font-size="13" font-family="sans-serif">Press Queue</text>
  <line x1="90" y1="70" x2="90" y2="120" stroke="#666" stroke-width="2"/>
  <line x1="160" y1="145" x2="220" y2="145" stroke="#666" stroke-width="2"/>
  <line x1="360" y1="145" x2="420" y2="145" stroke="#666" stroke-width="2"/>
  <line x1="490" y1="170" x2="490" y2="230" stroke="#666" stroke-width="2"/>
  <line x1="420" y1="255" x2="360" y2="255" stroke="#666" stroke-width="2"/>
</svg>`
      ),
      mimeType: "image/svg+xml",
      card: integrationCard,
      boardId: WORKFLOW_BOARD,
    },
    {
      name: "garcia-wedding-color-proof.txt",
      content: Buffer.from(
        `Garcia/Mitchell Wedding — Color Proof Report\n=============================================\nDate: February 4, 2026\nOperator: Emily Rodriguez\n\nPantone Reference: PMS 7621 (Uncoated)\nTarget CMYK: C:0 M:79 Y:89 K:18\nAdjusted CMYK: C:2 M:84 Y:87 K:20\n\nMeasurements (i1Pro3):\n  L*: 42.3 (target: 42.1)\n  a*: 48.7 (target: 49.0)\n  b*: 34.2 (target: 33.8)\n  Delta E: 1.8 ✓ (threshold: 3.0)\n\nFoil Registration: 0.2mm ✓ (threshold: 0.5mm)\nLetterpress Impression: Level D (client approved)\n\nStatus: APPROVED FOR PRODUCTION\n`
      ),
      mimeType: "text/plain",
      card: weddingCard,
      boardId: PRINTING_BOARD,
    },
  ]

  let attachmentsCreated = 0
  for (const { name, content, mimeType, card, boardId } of testFiles) {
    if (!card) continue

    const existing = await prisma.attachment.findFirst({
      where: { cardId: card.id, name },
    })
    if (existing) continue

    const uniquePrefix = Math.random().toString(36).slice(2, 10)
    const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `${boardId}/${card.id}/${uniquePrefix}-${sanitizedName}`

    const { data, error } = await supabase.storage
      .from("attachments")
      .upload(storagePath, content, { contentType: mimeType, upsert: false })

    if (error) {
      console.log(`  Failed to upload ${name}: ${error.message}`)
      continue
    }

    const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(data.path)

    await prisma.attachment.create({
      data: {
        cardId: card.id,
        name,
        url: urlData.publicUrl,
        storagePath: data.path,
        size: content.length,
        mimeType,
      },
    })
    attachmentsCreated++
  }
  console.log(`  Created ${attachmentsCreated} attachments`)

  // --- Final summary ---
  const counts = {
    cards: await prisma.card.count(),
    comments: await prisma.comment.count(),
    labels: await prisma.label.count(),
    attachments: await prisma.attachment.count(),
    customers: await prisma.customer.count(),
  }
  console.log("\n--- Seed complete! ---")
  console.log(`Total cards: ${counts.cards}`)
  console.log(`Total comments: ${counts.comments}`)
  console.log(`Total labels: ${counts.labels}`)
  console.log(`Total attachments: ${counts.attachments}`)
  console.log(`Total customers: ${counts.customers}`)
  console.log("\nCustomer portals:")
  console.log("  Acme Corp:            access code ACME2026")
  console.log("  123 Printing Ops:     access code PRINT123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
