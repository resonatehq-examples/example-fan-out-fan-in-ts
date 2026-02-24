import { Resonate } from "@resonatehq/sdk";
import { notifyAll } from "./workflow";
import type { OrderEvent } from "./channels";

// ---------------------------------------------------------------------------
// Resonate setup
// ---------------------------------------------------------------------------

const resonate = new Resonate();
resonate.register(notifyAll);

// ---------------------------------------------------------------------------
// Run the fan-out notification demo
// ---------------------------------------------------------------------------

const simulateCrash = process.argv.includes("--crash");

const event: OrderEvent = {
  orderId: `ord_${Date.now()}`,
  userId: "user_alice",
  event: "order.confirmed",
  message: "Your order has been confirmed! Estimated delivery: 2 hours.",
};

console.log("=== Fan-Out / Fan-In Notification Demo ===");
console.log(
  `Mode: ${simulateCrash ? "CRASH (push service down on first attempt, retries)" : "HAPPY PATH (all 4 channels in parallel)"}`,
);
console.log(`\nOrder ${event.orderId} confirmed — notifying customer ${event.userId}...\n`);

const wallStart = Date.now();

const result = await resonate.run(
  `notify/${event.orderId}`,
  notifyAll,
  event,
  simulateCrash,
);

const wallMs = Date.now() - wallStart;

console.log("\n=== Result ===");
console.log(`Channels notified: ${result.channelsNotified}/4`);
console.log(`Wall time: ${wallMs}ms`);
console.log(`\nChannel timings:`);
for (const r of result.results) {
  console.log(`  ${r.channel.padEnd(6)} ${r.durationMs}ms  ${r.messageId}`);
}

const sequential = result.results.reduce((s, r) => s + r.durationMs, 0);

if (!simulateCrash) {
  console.log(`\nFan-out time:   ${wallMs}ms`);
  console.log(`Sequential est: ${sequential}ms`);
  console.log(`Speedup:        ${(sequential / wallMs).toFixed(1)}x`);
}

if (simulateCrash) {
  console.log(
    "\nNotice: email/sms/slack each logged once. Push failed → retried → succeeded.",
    "\nEmail, SMS, and Slack were NOT re-sent during the push retry.",
  );
}
