import nodemailer from 'nodemailer'
import type { AppSettings } from '../types'

/** Render a simple {{variable}} template */
function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function buildTransport(s: AppSettings) {
  if (!s.smtp_host) throw new Error('SMTP nicht konfiguriert')
  return nodemailer.createTransport({
    host: s.smtp_host,
    port: parseInt(s.smtp_port || '587', 10),
    secure: s.smtp_secure === 'true',
    auth: s.smtp_user ? { user: s.smtp_user, pass: s.smtp_pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  })
}

export async function sendWelcomeEmail(
  to: string,
  vars: { name: string; username: string; appUrl: string },
  settings: AppSettings
): Promise<void> {
  const transport = buildTransport(settings)
  await transport.sendMail({
    from: settings.smtp_from || settings.smtp_user,
    to,
    subject: settings.welcome_email_subject,
    html: renderTemplate(settings.welcome_email_html, vars),
  })
}

export async function sendPasswordResetEmail(
  to: string,
  vars: { resetUrl: string; name: string },
  settings: AppSettings
): Promise<void> {
  const transport = buildTransport(settings)
  await transport.sendMail({
    from: settings.smtp_from || settings.smtp_user,
    to,
    subject: settings.password_reset_email_subject,
    html: renderTemplate(settings.password_reset_email_html, vars),
  })
}

export async function sendPasswordChangedEmail(
  to: string,
  vars: { name: string },
  settings: AppSettings
): Promise<void> {
  const transport = buildTransport(settings)
  await transport.sendMail({
    from: settings.smtp_from || settings.smtp_user,
    to,
    subject: settings.password_changed_email_subject,
    html: renderTemplate(settings.password_changed_email_html, vars),
  })
}

export async function testSmtpConnection(settings: AppSettings): Promise<void> {
  const transport = buildTransport(settings)
  await transport.verify()
}
