type PendingStoryNotification = {
  storyId: string;
  authorName: string;
};

function getBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function notifyPendingStory(
  payload: PendingStoryNotification,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  const from = process.env.ADMIN_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    return;
  }

  const adminUrl = `${getBaseUrl()}/admin`;
  const storyUrl = `${adminUrl}?story=${encodeURIComponent(payload.storyId)}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Flowers For Molly: New story submission pending review",
      html: `<p>A new story submission is awaiting review.</p>
<p><strong>Author:</strong> ${payload.authorName}</p>
<p><a href="${storyUrl}">Open moderation queue</a></p>`,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend API error (${res.status}): ${text}`);
  }
}
