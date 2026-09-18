import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * SMTP mailer — server-only. Credentials come from environment variables.
 * Optional Firestore override (host/port/user/from, but password stays env-only
 * unless explicitly stored encrypted — we keep password env-only by default).
 */

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

export function getSmtpConfigFromEnv(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  if (!host || !user || !password || !fromEmail) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure =
    (process.env.SMTP_SECURE ?? "").toLowerCase() === "true" || port === 465;
  return {
    host,
    port,
    secure,
    user,
    password,
    fromEmail,
    fromName: process.env.SMTP_FROM_NAME ?? "Photography",
    replyTo: process.env.SMTP_REPLY_TO || undefined,
  };
}

async function getSmtpDisplayOverrides(): Promise<Partial<SmtpConfig>> {
  // Non-secret display overrides stored by the owner panel (fromName/fromEmail/replyTo).
  try {
    const db = getAdminDb();
    if (!db) return {};
    const snap = await db.collection("siteSettings").doc("smtpMeta").get();
    if (!snap.exists) return {};
    const d = snap.data() as Record<string, unknown>;
    return {
      ...(typeof d.fromName === "string" ? { fromName: d.fromName } : {}),
      ...(typeof d.fromEmail === "string" ? { fromEmail: d.fromEmail } : {}),
      ...(typeof d.replyTo === "string" ? { replyTo: d.replyTo } : {}),
    };
  } catch {
    return {};
  }
}

export async function getEffectiveSmtpConfig(): Promise<SmtpConfig | null> {
  const base = getSmtpConfigFromEnv();
  if (!base) return null;
  const overrides = await getSmtpDisplayOverrides();
  return { ...base, ...overrides };
}

export function isSmtpConfigured(): boolean {
  return getSmtpConfigFromEnv() !== null;
}

/** Masked status for the owner UI — never includes the password. */
export async function getSmtpStatus(): Promise<{
  configured: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  fromEmail: string | null;
  fromName: string | null;
  secure: boolean;
  lastTestAt?: string | null;
  lastTestResult?: string | null;
}> {
  const cfg = getSmtpConfigFromEnv();
  let meta: { lastTestAt?: string; lastTestResult?: string } = {};
  try {
    const db = getAdminDb();
    if (db) {
      const snap = await db.collection("siteSettings").doc("smtpMeta").get();
      const d = snap.data() as Record<string, unknown> | undefined;
      if (d) {
        meta = {
          ...(typeof d.lastTestAt === "string" ? { lastTestAt: d.lastTestAt } : {}),
          ...(typeof d.lastTestResult === "string" ? { lastTestResult: d.lastTestResult } : {}),
        };
      }
    }
  } catch {
    /* ignore */
  }
  if (!cfg) {
    return {
      configured: false, host: null, port: null, user: null,
      fromEmail: null, fromName: null, secure: false,
      lastTestAt: meta.lastTestAt ?? null, lastTestResult: meta.lastTestResult ?? null,
    };
  }
  return {
    configured: true,
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    fromEmail: cfg.fromEmail,
    fromName: cfg.fromName,
    secure: cfg.secure,
    lastTestAt: meta.lastTestAt ?? null,
    lastTestResult: meta.lastTestResult ?? null,
  };
}

let transporter: Transporter | null = null;
let transporterKey = "";

export async function getTransporter(): Promise<Transporter | null> {
  const cfg = await getEffectiveSmtpConfig();
  if (!cfg) return null;
  const key = `${cfg.host}:${cfg.port}:${cfg.user}`;
  if (transporter && transporterKey === key) return transporter;
  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.password },
  });
  transporterKey = key;
  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<{ messageId: string }> {
  const cfg = await getEffectiveSmtpConfig();
  const tx = await getTransporter();
  if (!cfg || !tx) throw new Error("SMTP is not configured");
  const info = await tx.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo: opts.replyTo ?? cfg.replyTo,
  });
  return { messageId: info.messageId as string };
}

export function baseEmailTemplate(params: { title: string; bodyHtml: string; footer?: string }): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#eceae4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#08080a;border-top:3px solid #b99352;border-radius:10px 10px 0 0;padding:26px 30px;">
      <h1 style="color:#f5f1e6;margin:0;font-size:22px;font-weight:600;letter-spacing:0.5px;">${params.title}</h1>
    </div>
    <div style="background:#ffffff;border-bottom:3px solid #b99352;border-radius:0 0 10px 10px;padding:30px;color:#2a2b36;font-size:15px;line-height:1.65;">
      ${params.bodyHtml}
      <hr style="border:none;border-top:1px solid #e7e2d2;margin:24px 0;" />
      <p style="color:#6a6b7c;font-size:12px;margin:0;">${params.footer ?? "Photography — automated notification. Please do not reply unless a reply-to address was provided."}</p>
    </div>
  </div></body></html>`;
}
