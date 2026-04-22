import { NextRequest, NextResponse } from "next/server";
import { createLogger, getServerEnv } from "@ru/config";

const log = createLogger("api:webhooks:instagram");

/**
 * Instagram DM Auto-Reply Webhook
 *
 * Handles incoming Instagram DMs via Meta Graph API and responds
 * with relevant information based on keyword detection.
 *
 * Setup requirements:
 * - Meta Business Suite connected to Instagram Professional account
 * - Instagram App with `instagram_manage_messages` permission
 * - Webhook URL registered in Meta Developer Console
 * - INSTAGRAM_APP_SECRET and INSTAGRAM_ACCESS_TOKEN env vars
 *
 * Meta API constraints:
 * - Can only respond to user-initiated DMs within a 24-hour window
 * - Rate limit: 200 API calls/hour
 * - NO proactive outreach allowed
 */

const KEYWORD_RESPONSES: Record<string, string> = {
  price: `💰 *Mukha Mudra Pricing*

Face Yoga: ₹3,000/year or ₹1,111/month
Pranayama: ₹3,000/year or ₹1,111/month
Bundle (both): ₹6,000/year or ₹1,500/month

Recording add-on: ₹1,000/year (annual plans only)

👉 See all plans: https://mukhamudra.com/pricing`,

  join: `🙏 *Ready to join?*

1. Visit https://mukhamudra.com/pricing
2. Choose Face Yoga, Pranayama, or Bundle
3. Pick your batch time
4. Subscribe: you'll be added to your WhatsApp group instantly!

Sessions run Mon/Wed/Fri. Start this week.`,

  schedule: `📅 *Session Schedule*

*Face Yoga* (evenings):
• 9:00 PM IST, Mon/Wed/Fri
• 10:00 PM IST, Mon/Wed/Fri

*Pranayama* (mornings):
• 8:00 AM IST, Mon/Wed/Fri
• 9:00 AM IST, Mon/Wed/Fri

Each session is 30 minutes, live on Google Meet.`,

  recording: `🎬 *Recording Access*

Available as an add-on for annual plan subscribers.
₹1,000/year: access ALL session recordings across Face Yoga and Pranayama.

Recordings are available within 24 hours of each session.

👉 Subscribe annually first: https://mukhamudra.com/pricing`,

  book: `📖 *How to Book*

1. Subscribe at https://mukhamudra.com/pricing
2. Log in to your dashboard at https://mukhamudra.com/app
3. Go to "Book" and select an available session
4. Show up on Google Meet at your session time!

Questions? Reply here or message us on WhatsApp.`,
};

const DEFAULT_RESPONSE = `Hey! 👋 Thanks for reaching out to Mukha Mudra.

I can help you with:
• *price*: see our plans
• *join*: how to get started
• *schedule*: session times
• *recording*: recording access info
• *book*: how to book sessions

Just reply with any of these keywords!

Or visit https://mukhamudra.com for the full experience.`;

// ─── GET: Meta webhook verification ───

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const env = getServerEnv();
  const verifyToken = env.INSTAGRAM_VERIFY_TOKEN;

  if (!verifyToken) {
    return NextResponse.json(
      { error: "Instagram webhook not configured" },
      { status: 500 }
    );
  }

  if (mode === "subscribe" && token === verifyToken) {
    log.info("Instagram webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// ─── POST: Incoming DM events ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Meta sends a different structure for Instagram messaging
    const entries = body.entry || [];

    for (const entry of entries) {
      const messaging = entry.messaging || [];

      for (const event of messaging) {
        // Only handle text messages (not reactions, reads, etc.)
        if (!event.message?.text) continue;

        const senderId = event.sender?.id;
        const messageText = event.message.text.toLowerCase().trim();

        if (!senderId) continue;

        // Detect keywords
        let response = DEFAULT_RESPONSE;
        for (const [keyword, reply] of Object.entries(KEYWORD_RESPONSES)) {
          if (messageText.includes(keyword)) {
            response = reply;
            break;
          }
        }

        // Send reply via Meta Graph API
        await sendInstagramReply(senderId, response);

        log.info(
          { senderId, keyword: messageText.substring(0, 50) },
          "Instagram DM auto-reply sent"
        );
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    log.error({ err: error }, "Instagram webhook processing failed");
    return NextResponse.json({ status: "ok" }); // Always return 200 to Meta
  }
}

async function sendInstagramReply(
  recipientId: string,
  message: string
): Promise<void> {
  const env = getServerEnv();
  const accessToken = env.INSTAGRAM_ACCESS_TOKEN;
  const pageId = env.INSTAGRAM_PAGE_ID;

  if (!accessToken || !pageId) {
    log.warn("Instagram access token or page ID not configured — skipping reply");
    return;
  }

  const url = `https://graph.facebook.com/v21.0/${pageId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    log.error(
      { status: res.status, body: errorBody },
      "Failed to send Instagram reply"
    );
  }
}
