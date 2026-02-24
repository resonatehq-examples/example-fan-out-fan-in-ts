import type { Context } from "@resonatehq/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrderEvent {
  orderId: string;
  userId: string;
  event: string;
  message: string;
}

export interface ChannelResult {
  channel: string;
  success: boolean;
  messageId: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Track push notification attempts for crash demo
const pushAttempts = new Map<string, number>();

// ---------------------------------------------------------------------------
// Four independent notification channels
// Each has realistic latency — email is slow, push is fast, etc.
// ---------------------------------------------------------------------------

export async function sendEmail(_ctx: Context, event: OrderEvent): Promise<ChannelResult> {
  const start = Date.now();
  console.log(`  [email]   Sending order confirmation to user ${event.userId}...`);
  await sleep(400); // SMTP is slow
  const messageId = `msg_email_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`  [email]   Sent — ${messageId}`);
  return { channel: "email", success: true, messageId, durationMs: Date.now() - start };
}

export async function sendSms(_ctx: Context, event: OrderEvent): Promise<ChannelResult> {
  const start = Date.now();
  console.log(`  [sms]     Sending SMS to user ${event.userId}...`);
  await sleep(250); // Twilio is fast
  const messageId = `msg_sms_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`  [sms]     Sent — ${messageId}`);
  return { channel: "sms", success: true, messageId, durationMs: Date.now() - start };
}

export async function sendSlack(_ctx: Context, event: OrderEvent): Promise<ChannelResult> {
  const start = Date.now();
  console.log(`  [slack]   Posting to #orders channel...`);
  await sleep(180); // Slack webhooks are quick
  const messageId = `msg_slack_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`  [slack]   Posted — ${messageId}`);
  return { channel: "slack", success: true, messageId, durationMs: Date.now() - start };
}

export async function sendPush(
  _ctx: Context,
  event: OrderEvent,
  simulateCrash: boolean,
): Promise<ChannelResult> {
  const start = Date.now();
  const attempt = (pushAttempts.get(event.orderId) ?? 0) + 1;
  pushAttempts.set(event.orderId, attempt);

  console.log(`  [push]    Sending push notification to user ${event.userId} (attempt ${attempt})...`);
  await sleep(120);

  if (simulateCrash && attempt === 1) {
    // Push service is temporarily down. Resonate retries this step.
    // Email, SMS, and Slack are already checkpointed — they do NOT re-send.
    throw new Error("Push service unavailable — will retry");
  }

  const messageId = `msg_push_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`  [push]    Delivered — ${messageId}`);
  return { channel: "push", success: true, messageId, durationMs: Date.now() - start };
}
