import type { Job } from 'bullmq';
import nodemailer from 'nodemailer';
import pino from 'pino';

const logger = pino({ level: 'info' });

function getTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }
  // Dev: use ethereal or log
  return nodemailer.createTransport({ jsonTransport: true });
}

const EMAIL_TEMPLATES: Record<string, (data: Record<string, string>) => { subject: string; html: string; text: string }> = {
  'verify-email': (data) => ({
    subject: 'Verify your email address',
    text: `Hi ${data.fullName},\n\nVerify your email: ${data.verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `<h2>Hi ${data.fullName},</h2><p>Click the link below to verify your email address:</p><p><a href="${data.verifyUrl}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
  }),
  'password-reset': (data) => ({
    subject: 'Reset your password',
    text: `Hi ${data.fullName},\n\nReset your password: ${data.resetUrl}\n\nThis link expires in 1 hour.`,
    html: `<h2>Hi ${data.fullName},</h2><p>Click below to reset your password:</p><p><a href="${data.resetUrl}">Reset Password</a></p><p>This link expires in 1 hour.</p>`,
  }),
  'invite': (data) => ({
    subject: `You've been invited to ${data.orgName}`,
    text: `You've been invited to join ${data.orgName} as ${data.role}.\n\nAccept: ${data.inviteUrl}`,
    html: `<h2>You're invited!</h2><p>You've been invited to join <strong>${data.orgName}</strong> as <strong>${data.role}</strong>.</p><p><a href="${data.inviteUrl}">Accept Invitation</a></p>`,
  }),
};

export async function emailProcessor(job: Job) {
  const log = logger.child({ correlationId: job.data.correlationId, jobId: job.id, queue: 'email' });
  log.info({ to: job.data.to, template: job.data.template }, 'Sending email');

  const { to, template, data, subject: subjectOverride } = job.data;

  const templateFn = EMAIL_TEMPLATES[template];
  let emailContent: { subject: string; html: string; text: string };

  if (templateFn) {
    emailContent = templateFn(data ?? {});
  } else {
    emailContent = {
      subject: subjectOverride ?? 'Notification',
      html: `<p>${JSON.stringify(data)}</p>`,
      text: JSON.stringify(data),
    };
  }

  const transport = getTransport();

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@example.com',
    to,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  log.info({ messageId: (info as any).messageId }, 'Email sent');
  return info;
}
