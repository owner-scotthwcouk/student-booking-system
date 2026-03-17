import { sendEmail } from '../_sendgrid.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const {
      studentEmail,
      subject,
      message,
      tutorName,
      tutorEmail,
      studentName
    } = req.body || {}

    if (!studentEmail || !subject || !message) {
      return res.status(400).json({ error: 'missing_required_fields' })
    }

    const trimmedSubject = String(subject).trim()
    const trimmedMessage = String(message).trim()

    if (!trimmedSubject || !trimmedMessage) {
      return res.status(400).json({ error: 'empty_subject_or_message' })
    }

    const safeStudentName = studentName || 'Student'
    const safeTutorName = tutorName || 'Your tutor'
    const plainText = `${trimmedMessage}\n\nFrom: ${safeTutorName}`
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
        <p>Hi ${safeStudentName},</p>
        <p>${trimmedMessage.replace(/\n/g, '<br />')}</p>
        <p style="margin-top:24px;">From,<br />${safeTutorName}</p>
      </div>
    `

    await sendEmail({
      to: studentEmail,
      subject: trimmedSubject,
      text: plainText,
      html,
      replyTo: tutorEmail || undefined
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('send-student email error:', err)
    return res.status(500).json({
      error: 'email_send_failed',
      message: String(err?.message || err)
    })
  }
}
