/* hello@qpio.app - the contact address, delivered to two inboxes.
 *
 * Founder, 20 Oct 2026: tester mail goes to the Qpio inbox, with a copy to his own Gmail so
 * the agent can read it and draft replies. Cloudflare Email Routing hands every message sent
 * to hello@qpio.app to this Worker (rule "Send to a Worker"), and it forwards the message,
 * unchanged, to both addresses. Both must be verified destinations of the Cloudflare account.
 *
 *   npx --no-install wrangler deploy -c wrangler.mail.jsonc
 *
 * Nothing is stored or read here: the message passes straight through. If one inbox refuses
 * (for example an address not verified yet), the other still gets it; only when both refuse
 * does the sender get a bounce, so a message is never silently lost. /privacy (#contact)
 * describes this: Cloudflare passes the email on, and Google hosts the inboxes.
 */
export const INBOXES = ["qpiocorp@gmail.com", "ukbchali@gmail.com"];

export default {
  async email(message) {
    const results = await Promise.allSettled(INBOXES.map((to) => message.forward(to)));
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) console.error("mail: " + failed.length + " of " + INBOXES.length + " inboxes refused");   // counts only, never an address or a subject
    if (failed.length === INBOXES.length) message.setReject("Could not deliver to Qpio; please try again later.");
  }
};
