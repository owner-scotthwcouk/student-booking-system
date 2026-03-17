import sgMail from '@sendgrid/mail'

let apiKeyConfigured = false

function getFromField() {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL
  const fromName = process.env.SENDGRID_FROM_NAME || 'Edumaxim'

  if (!fromEmail) {
    throw new Error('Missing SENDGRID_FROM_EMAIL')
  }

  return { email: fromEmail, name: fromName }
}

function ensureSendGridConfigured() {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    throw new Error('Missing SENDGRID_API_KEY')
  }

  if (!apiKeyConfigured) {
    sgMail.setApiKey(apiKey)
    apiKeyConfigured = true
  }
}

export async function sendEmail({ to, subject, text, html, replyTo }) {
  if (!to || !subject) {
    throw new Error('Email "to" and "subject" are required')
  }

  ensureSendGridConfigured()

  const msg = {
    to,
    from: getFromField(),
    subject,
    text: text || undefined,
    html: html || undefined,
    replyTo: replyTo || undefined
  }

  await sgMail.send(msg)
}
