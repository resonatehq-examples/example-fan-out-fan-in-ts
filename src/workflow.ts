import type { Context } from "@resonatehq/sdk";
import {
  sendEmail,
  sendSms,
  sendSlack,
  sendPush,
  type OrderEvent,
  type ChannelResult,
} from "./channels";

// ---------------------------------------------------------------------------
// Fan-Out / Fan-In Notification Workflow
// ---------------------------------------------------------------------------
// When an order is confirmed, notify the customer through ALL channels
// simultaneously: email, SMS, Slack, and push notification.
//
// beginRun() starts each channel without blocking — all four start at once.
// yield* future collects each result — the fan-in.
//
// Total time ≈ max(individual channel latencies), not the sum.
// If push service is down and retries, email/SMS/Slack are already done.
// They do NOT re-send. Each channel is an independent checkpoint.
//
// This is the difference between:
//   Sequential: 400ms + 250ms + 180ms + 120ms = 950ms
//   Fan-out:    max(400ms, 250ms, 180ms, 120ms) = 400ms

export interface NotificationSummary {
  orderId: string;
  channelsNotified: number;
  totalMs: number;
  results: ChannelResult[];
}

export function* notifyAll(
  ctx: Context,
  event: OrderEvent,
  simulateCrash: boolean,
): Generator<any, NotificationSummary, any> {
  const start = Date.now();

  // Fan-out: start all 4 channels simultaneously
  // beginRun() returns a handle immediately — no blocking
  const emailFuture = yield* ctx.beginRun(sendEmail, event);
  const smsFuture = yield* ctx.beginRun(sendSms, event);
  const slackFuture = yield* ctx.beginRun(sendSlack, event);
  const pushFuture = yield* ctx.beginRun(sendPush, event, simulateCrash);

  // Fan-in: wait for each result
  // If push fails and retries, the other channels are already checkpointed
  const results: ChannelResult[] = [
    yield* emailFuture,
    yield* smsFuture,
    yield* slackFuture,
    yield* pushFuture,
  ];

  return {
    orderId: event.orderId,
    channelsNotified: results.filter((r) => r.success).length,
    totalMs: Date.now() - start,
    results,
  };
}
