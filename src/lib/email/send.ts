import nodemailer from "nodemailer";

import { sql } from "@/lib/db";

interface SmtpConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  from_name?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function getSmtpConfig(userId: string): Promise<SmtpConfig | null> {
  try {
    const rows = await sql`
      SELECT properties FROM integrations
      WHERE user_id = ${userId}::uuid AND provider = 'smtp-email' AND is_active = true
      LIMIT 1
    `;
    if (rows.length === 0) return null;

    const props = (rows[0] as { properties: SmtpConfig | null }).properties;
    if (!props?.smtp_host || !props?.smtp_user || !props?.smtp_pass) return null;

    return props;
  } catch {
    return null;
  }
}

export async function getAnySmtpConfig(): Promise<{ config: SmtpConfig; userId: string } | null> {
  try {
    const rows = await sql`
      SELECT user_id, properties FROM integrations
      WHERE provider = 'smtp-email' AND is_active = true
      LIMIT 1
    `;
    if (rows.length === 0) return null;

    const row = rows[0] as { user_id: string; properties: SmtpConfig | null };
    if (!row.properties?.smtp_host || !row.properties?.smtp_user || !row.properties?.smtp_pass) return null;

    return { config: row.properties, userId: row.user_id };
  } catch {
    return null;
  }
}

export async function sendEmail(config: SmtpConfig, options: EmailOptions): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: parseInt(config.smtp_port || "587", 10),
    secure: parseInt(config.smtp_port || "587", 10) === 465,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  });

  const fromName = config.from_name || "NEXUS SEO";
  const from = `"${fromName}" <${config.smtp_user}>`;

  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  return true;
}
