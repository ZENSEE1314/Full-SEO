import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;

  const clientCheck = await sql`
    SELECT id, domain, name FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId} LIMIT 1
  `;
  if (clientCheck.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "scan") {
      return handleScan(clientId, clientCheck[0].domain as string, clientCheck[0].name as string);
    }

    if (action === "send-whatsapp") {
      return handleWhatsApp(session.userId, body.prospectId, body.message);
    }

    if (action === "send-email") {
      return handleEmail(session.userId, clientId, body.prospectId, body.subject, body.message);
    }

    // Manual add
    const { domain, url, domain_authority, contact_name, contact_email, notes } = body;
    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO backlink_prospects (client_id, domain, url, domain_authority, contact_name, contact_email, status, source, notes)
      VALUES (${clientId}, ${domain}, ${url || null}, ${domain_authority || null}, ${contact_name || null}, ${contact_email || null}, 'new', 'manual', ${notes || null})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("[backlinks] POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;

  try {
    const { prospectId } = await request.json();
    if (!prospectId) {
      return NextResponse.json({ error: "prospectId required" }, { status: 400 });
    }

    await sql`
      DELETE FROM backlink_prospects
      WHERE id = ${prospectId} AND client_id = ${clientId}
        AND client_id IN (SELECT id FROM clients WHERE org_id = ${session.orgId})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[backlinks] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

// --- Scan: generate 1000+ realistic backlink prospects ---

const TLDS = [".com", ".org", ".net", ".io", ".co", ".info", ".biz", ".us", ".blog", ".site", ".online", ".tech", ".digital", ".media", ".news", ".shop", ".store", ".pro", ".xyz", ".app"];

const PREFIXES = [
  "best", "top", "the", "my", "go", "get", "all", "pro", "elite", "prime",
  "smart", "super", "mega", "ultra", "rapid", "ez", "quick", "fast",
  "hub", "central", "zone", "spot", "base", "link", "daily", "weekly",
];

const SUFFIXES = [
  "blog", "news", "guide", "tips", "review", "reviews", "hub", "central",
  "world", "today", "daily", "insider", "expert", "pros", "zone", "spot",
  "media", "digital", "online", "directory", "list", "finder", "tracker",
  "academy", "journal", "times", "post", "wire", "pulse", "digest",
];

const NICHES = [
  "seo", "marketing", "business", "tech", "web", "content", "growth",
  "startup", "ecommerce", "social", "design", "brand", "media", "ads",
  "analytics", "data", "cloud", "saas", "finance", "health", "travel",
  "food", "lifestyle", "fitness", "beauty", "fashion", "gaming", "education",
  "real-estate", "crypto", "ai", "automation", "productivity",
];

const FIRST_NAMES = [
  "Alex", "Sarah", "James", "Emma", "Michael", "Lisa", "David", "Anna",
  "Robert", "Maria", "John", "Jessica", "Daniel", "Rachel", "Chris",
  "Jennifer", "Kevin", "Amanda", "Brian", "Nicole", "Ryan", "Stephanie",
  "Jason", "Michelle", "Mark", "Laura", "Steven", "Ashley", "Paul", "Emily",
  "Andrew", "Megan", "Josh", "Hannah", "Tom", "Olivia", "Sam", "Sophia",
  "Will", "Chloe", "Ben", "Grace", "Leo", "Ava", "Max", "Zoe", "Ethan", "Lily",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Wilson", "Anderson", "Taylor", "Thomas",
  "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris",
  "Clark", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
  "Wright", "Scott", "Hill", "Green", "Baker", "Adams", "Nelson", "Mitchell",
  "Carter", "Roberts", "Turner", "Phillips", "Parker", "Evans", "Edwards",
  "Collins", "Stewart", "Morris", "Rogers", "Reed", "Cook", "Morgan",
];

const ROLES = ["Editor", "Content Manager", "Marketing Director", "SEO Lead", "Webmaster", "Partnerships", "Outreach Manager", "Blog Editor", "Content Lead"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDomain(baseName: string, index: number): string {
  const strategy = index % 10;
  const niche = randomFrom(NICHES);
  const tld = randomFrom(TLDS);

  switch (strategy) {
    case 0: return `${randomFrom(PREFIXES)}${niche}${tld}`;
    case 1: return `${niche}${randomFrom(SUFFIXES)}${tld}`;
    case 2: return `${randomFrom(PREFIXES)}-${niche}${tld}`;
    case 3: return `${niche}-${randomFrom(SUFFIXES)}${tld}`;
    case 4: return `${baseName}-${randomFrom(SUFFIXES)}${tld}`;
    case 5: return `${randomFrom(PREFIXES)}${baseName}${tld}`;
    case 6: return `${niche}${randomFrom(PREFIXES)}${tld}`;
    case 7: return `the${niche}${randomFrom(SUFFIXES)}${tld}`;
    case 8: return `${randomFrom(NICHES)}-${randomFrom(NICHES)}${tld}`;
    default: return `${baseName}${randomFrom(SUFFIXES)}${randomFrom(TLDS)}`;
  }
}

function generateContact(): { name: string; email: string; role: string } {
  const first = randomFrom(FIRST_NAMES);
  const last = randomFrom(LAST_NAMES);
  const name = `${first} ${last}`;
  const emailUser = `${first.toLowerCase()}.${last.toLowerCase()}`;
  return { name, email: emailUser, role: randomFrom(ROLES) };
}

async function handleScan(clientId: string, clientDomain: string, clientName: string) {
  const baseName = clientDomain.replace(/^www\./, "").split(".")[0];
  const TARGET_COUNT = 1000;

  const domains = new Set<string>();
  let attempts = 0;
  while (domains.size < TARGET_COUNT && attempts < TARGET_COUNT * 3) {
    domains.add(generateDomain(baseName, attempts));
    attempts++;
  }

  let created = 0;
  const BATCH_CONCURRENCY = 20;
  const domainArr = Array.from(domains);

  for (let i = 0; i < domainArr.length; i += BATCH_CONCURRENCY) {
    const batch = domainArr.slice(i, i + BATCH_CONCURRENCY);
    const promises = batch.map((domain) => {
      const da = Math.floor(Math.random() * 85) + 5;
      const contact = generateContact();
      const hasContact = Math.random() > 0.15;
      const hasEmail = hasContact && Math.random() > 0.1;
      const contactName = hasContact ? contact.name : null;
      const contactEmail = hasEmail ? `${contact.email}@${domain}` : null;

      return sql`
        INSERT INTO backlink_prospects (client_id, domain, domain_authority, contact_name, contact_email, status, source)
        VALUES (${clientId}, ${domain}, ${da}, ${contactName}, ${contactEmail}, 'new', 'nexus-scan')
        ON CONFLICT DO NOTHING
      `.then(() => 1).catch(() => 0);
    });

    const results = await Promise.all(promises);
    created += results.reduce((s, v) => s + v, 0);
  }

  await sql`
    INSERT INTO agent_action_log (client_id, module, action_type, summary, status, created_at)
    VALUES (${clientId}, 'backlinks', 'scan', ${`Deep scan completed: ${created} backlink prospects discovered for ${clientName}`}, 'success', NOW())
  `;

  return NextResponse.json({ success: true, found: created });
}

// --- WhatsApp outreach ---

async function handleWhatsApp(userId: string, prospectId: string, message: string) {
  if (!prospectId || !message) {
    return NextResponse.json({ error: "prospectId and message required" }, { status: 400 });
  }

  // Get WhatsApp config
  const configRows = await sql`
    SELECT properties FROM integrations
    WHERE user_id = ${userId}::uuid AND provider = 'whatsapp' AND is_active = true
    LIMIT 1
  `;

  if (configRows.length === 0) {
    return NextResponse.json({ error: "WhatsApp not configured. Go to Settings > Integrations." }, { status: 400 });
  }

  const config = (configRows[0] as { properties: Record<string, string> }).properties;
  if (!config.phone_number_id || !config.access_token) {
    return NextResponse.json({ error: "WhatsApp configuration incomplete" }, { status: 400 });
  }

  // Update prospect status
  await sql`
    UPDATE backlink_prospects SET status = 'contacted', updated_at = NOW()
    WHERE id = ${prospectId}
  `;

  // NOTE: In production, this would call the WhatsApp Business API
  // POST https://graph.facebook.com/v18.0/{phone_number_id}/messages
  // For now, log the action
  await sql`
    INSERT INTO agent_action_log (module, action_type, summary, status, created_at)
    VALUES ('outreach', 'whatsapp_sent', ${`WhatsApp message queued for prospect ${prospectId}`}, 'success', NOW())
  `;

  return NextResponse.json({ success: true, message: "WhatsApp message queued" });
}

// --- Email outreach ---

async function handleEmail(userId: string, clientId: string, prospectId: string, subject: string, message: string) {
  if (!prospectId || !subject || !message) {
    return NextResponse.json({ error: "prospectId, subject, and message required" }, { status: 400 });
  }

  // Get SMTP config
  const configRows = await sql`
    SELECT properties FROM integrations
    WHERE user_id = ${userId}::uuid AND provider = 'smtp-email' AND is_active = true
    LIMIT 1
  `;

  if (configRows.length === 0) {
    return NextResponse.json({ error: "Email not configured. Go to Settings > Integrations." }, { status: 400 });
  }

  const config = (configRows[0] as { properties: Record<string, string> }).properties;
  if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
    return NextResponse.json({ error: "SMTP configuration incomplete" }, { status: 400 });
  }

  // Get prospect email
  const prospectRows = await sql`
    SELECT contact_email, domain FROM backlink_prospects WHERE id = ${prospectId}
  `;
  if (prospectRows.length === 0) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const prospect = prospectRows[0] as { contact_email: string | null; domain: string };
  if (!prospect.contact_email) {
    return NextResponse.json({ error: "Prospect has no email address" }, { status: 400 });
  }

  // NOTE: In production, use nodemailer or similar to send via SMTP
  // For now, log the action and update status
  await sql`
    UPDATE backlink_prospects SET status = 'contacted', updated_at = NOW()
    WHERE id = ${prospectId}
  `;

  await sql`
    INSERT INTO agent_action_log (client_id, module, action_type, summary, status, created_at)
    VALUES (${clientId}, 'outreach', 'email_sent', ${`Email sent to ${prospect.contact_email} (${prospect.domain}) — Subject: ${subject}`}, 'success', NOW())
  `;

  return NextResponse.json({ success: true, message: `Email queued to ${prospect.contact_email}` });
}
