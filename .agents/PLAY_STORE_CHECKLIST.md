# SportGo Play Store readiness checklist

## Current scope

- [x] Account deletion exists in web.
- [x] Account deletion exists in mobile.
- [x] External account deletion URL exists and is publicly reachable.
- [x] Backend deletion semantics cover account-owned profile, OAuth identity, uploaded media, posts/comments, messages, preferences, and payment records or clearly documented retention.
- [x] Privacy Policy is public, non-PDF, linked from both clients, and names SportGo/developer.
- [ ] Data Safety inventory matches actual client, server, and third-party SDK behavior.
- [x] Terms/Community Guidelines are accepted before users create UGC.
- [x] Users can report public posts, comments, and users.
- [x] Users can block users in direct interaction/chat.
- [x] Reports reach an admin moderation queue with an action path.
- [x] Mobile does not expose QR/manual Premium payment; it shows the web redirect notice.
- [x] Web payment flow remains unchanged unless separately approved.
- [ ] Target API and production AAB are verified.
- [ ] Play Console app access/demo account instructions are ready.
- [ ] Target audience, content rating, and ads declaration are accurate.

## Existing visual-system guardrails

- Reuse current `client/src` and `mobile/src` primitives.
- Preserve current button labels, variants, colors, typography, spacing, radii, icon family, toast/dialog behavior, and navigation conventions.
- New compliance screens should look native to SportGo and should not introduce a separate design system.

## Verification notes

- Record the exact file/API changed for every checklist item.
- Test both authenticated and unauthenticated states.
- Test deletion confirmation, cancellation, failure, success, and logout/session cleanup.
- Test report/block actions from public content and 1:1 chat.
- Test that mobile payment never renders the QR image or upload-proof controls.
