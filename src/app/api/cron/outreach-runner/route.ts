import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getAnySmtpConfig, sendEmail } from "@/lib/email/send";

const CRON_SECRET = process.env.CRON_SECRET;
const DAILY_SEND_LIMIT = 50;

function composeOutreachEmail(prospect: {
  contact_name: string | null;
  domain: string;
  client_name: string;
  client_domain: string;
}): { subject: string; text: string; html: string } {
  const firstName = prospect.contact_name?.split(" ")[0] || "there";

  const subject = `Collaboration opportunity — ${prospect.client_name}`;

  const text = `Hi ${firstName},

I came across ${prospect.domain} and really enjoyed your content. I'm reaching out from ${prospect.client_name} (${prospect.client_domain}) to explore a potential collaboration.

We'd love to contribute a high-quality guest article to your site that would be valuable to your readers. We have several topic ideas that align well with your audience.

Would you be open to discussing this? Happy to share our content ideas.

Best regards,
${prospect.client_name} Team
${prospect.client_domain}`;

  const html = `<div style="font-family: -apple-system, sans-serif; max-width: 600px; color: #333;">
<p>Hi ${firstName},</p>
<p>I came across <strong>${prospect.domain}</strong> and really enjoyed your content. I'm reaching out from <strong>${prospect.client_name}</strong> (${prospect.client_domain}) to explore a potential collaboration.</p>
<p>We'd love to contribute a high-quality guest article to your site that would be valuable to your readers. We have several topic ideas that align well with your audience.</p>
<p>Would you be open to discussing this? Happy to share our content ideas.</p>
<p>Best regards,<br/><strong>${prospect.client_name} Team</strong><br/>${prospect.client_domain}</p>
</div>`;

  return { subject, text, html };
}

export async function POST(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Get SMTP config from any user who has it configured
    const smtpResult = await getAnySmtpConfig();
    if (!smtpResult) {
      return NextResponse.json({
        success: false,
        error: "No SMTP configured. Go to Settings > Integrations > Email Outreach.",
        sent: 0,
      });
    }

    const { config } = smtpResult;

    // Fetch prospects with email that haven't been contacted yet
    const prospects = await sql`
      SELECT bp.id, bp.domain, bp.contact_name, bp.contact_email, bp.client_id,
             c.name AS client_name, c.domain AS client_domain
      FROM backlink_prospects bp
      JOIN clients c ON bp.client_id = c.id
      WHERE bp.status = 'new'
        AND bp.contact_email IS NOT NULL
        AND c.status = 'active'
      ORDER BY bp.domain_authority DESC NULLS LAST
      LIMIT ${DAILY_SEND_LIMIT}
    `;

    let sent = 0;
    let failed = 0;

    for (const row of prospects) {
      const prospect = row as {
        id: string;
        domain: string;
        contact_name: string | null;
        contact_email: string;
        client_id: string;
        client_name: string;
        client_domain: string;
      };

      const email = composeOutreachEmail(prospect);

      try {
        await sendEmail(config, {
          to: prospect.contact_email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });

        await sql`
          UPDATE backlink_prospects
          SET status = 'contacted', updated_at = NOW()
          WHERE id = ${prospect.id}
        `;

        await sql`
          INSERT INTO agent_action_log (client_id, module, action_type, summary, status, triggered_by, created_at)
          VALUES (${prospect.client_id}, 'outreach', 'email_sent',
            ${`Outreach email sent to ${prospect.contact_name || prospect.contact_email} at ${prospect.domain}`},
            'success', 'nexus-cron', NOW())
        `;

        sent++;
      } catch (err) {
        console.error(`[outreach] Failed to send to ${prospect.contact_email}:`, err);
        failed++;
      }
    }

    if (sent > 0 || failed > 0) {
      await sql`
        INSERT INTO agent_action_log (module, action_type, summary, status, triggered_by, created_at)
        VALUES ('outreach', 'outreach_batch',
          ${`Daily outreach: ${sent} emails sent, ${failed} failed out of ${prospects.length} prospects`},
          ${failed > 0 ? 'warning' : 'success'}, 'nexus-cron', NOW())
      `;
    }

    return NextResponse.json({ success: true, sent, failed, total: prospects.length });
  } catch (error) {
    console.error("[cron/outreach-runner] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
