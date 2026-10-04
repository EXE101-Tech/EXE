# SportGo Google Play readiness instructions

## Scope

This project has a web client in `client`, an Expo/React Native app in `mobile`, and a FastAPI backend in `server`. The goal of this work is to make both web and mobile ready for Google Play policy review without redesigning the existing product.

## User constraints

- Preserve the existing visual language, spacing, typography, colors, cards, borders, radii, icons, button variants, dialogs, navigation, and copy style.
- Do not replace or restyle existing components when adding compliance features.
- New UI must reuse the existing components and patterns in the same folder/platform.
- Place new actions where users already expect account, content, or payment settings to live.
- Keep web behavior unchanged unless a Google Play or shared-policy requirement requires a corresponding change.
- On mobile, do not show the existing payment QR/image or manual payment flow. Show this exact intent in the existing dialog/card style: `Thanh toán trên mobile sẽ sớm được cập nhật, mời bạn qua trang web của SportGo để thực hiện giao dịch.` The web destination is `https://sportgo.io.vn`.
- Do not introduce a new visual system or install UI libraries unless explicitly requested.

## Required implementation checklist

1. Account deletion: add an authenticated in-app deletion request/action on web and mobile, add an externally reachable deletion page, and implement a backend endpoint that handles associated account data and documents any legally required retention.
2. Privacy: add an accessible Privacy Policy entry point in both clients and prepare an accurate data inventory for Play Console Data Safety.
3. UGC safety: add Terms/Community Guidelines acceptance before posting, report actions for public content/users, block action for direct interactions, and connect reports to an actionable moderation queue.
4. Mobile Premium: replace mobile QR/manual proof payment UI with the approved redirect notice to `https://sportgo.io.vn`; keep the current web payment flow untouched unless separately requested.
5. Play Console readiness: verify target API, permissions, ads declaration, target audience/content rating, app access instructions, reviewer account, and production AAB.
6. Verification: run existing tests/lint/type checks where available, test web flows with browser automation, and manually verify mobile flows with the Expo development client/device.

## Working method

- Inspect existing components and APIs before adding anything.
- Prefer the smallest change that satisfies the requirement.
- Reuse existing dialogs, buttons, cards, toast/error patterns, and navigation.
- Do not silently change unrelated features or user-facing behavior.
- Treat Google Play official policy pages as the source of truth for compliance decisions.
- Record unresolved policy assumptions in the checklist instead of guessing.

## Skill routing

- Use `skills/frontend-design/SKILL.md` only to preserve and extend the existing visual system; its generic redesign guidance must not override the user constraints above.
- Use `skills/webapp-testing/SKILL.md` for web UI verification and Playwright-based checks.
- Use the project-level `mobile/AGENTS.md` for Expo/React Native and EAS instructions.
