// supabase/functions/_shared/email.ts

function required(name: string): string {
  const v = Deno.env.get(name);
  if (!v || !v.trim()) throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

export const EMAIL_CONFIG = {
  apiKey: required("BREVO_API_KEY"),
  from: required("BREVO_FROM"),
};

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": EMAIL_CONFIG.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: EMAIL_CONFIG.from },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error (${res.status}): ${text}`);
  }

  return await res.json();
}
