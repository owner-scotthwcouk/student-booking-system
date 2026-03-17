export async function sendStudentEmail(payload) {
  const res = await fetch('/api/email/send-student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.message || json?.error || 'Failed to send email')
  }

  return json
}
