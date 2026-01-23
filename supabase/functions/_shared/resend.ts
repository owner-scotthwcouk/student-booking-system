// supabase/functions/_shared/resend.ts

function required(name: string): string {
  const v = Deno.env.get(name);
  if (!v || !v.trim()) throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

export const RESEND = {
  apiKey: required("RESEND_API_KEY"),
  from: required("RESEND_FROM"),
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
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND.from,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error (${res.status}): ${text}`);
  }

  return await res.json();
}
