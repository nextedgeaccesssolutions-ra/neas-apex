# NEAS APEX holographic avatar — Tasks

Updated: 2026-11-23

## Implementation
- [x] Use the operator-supplied blue holographic face portrait.
- [x] Overlay the avatar inside the existing central gold orb without replacing the dashboard.
- [x] Add idle breathing, glowing eyes and reduced-motion support.
- [x] Add accessible central-core tap activation that starts the browser voice conversation.
- [x] Synchronize core/avatar state and speaking waveform with browser speech synthesis lifecycle events.
- [x] Add image selection, local preview, upload and multimodal prompt submission.
- [x] Keep browser-native voice independent of third-party voice credentials; no voice API key is exposed to the browser.
- [x] Preserve origin-header enforcement and allowlist only known NEAS APEX hosts.
- [x] Set the approved welcome greeting on Main and Engineering AI candidate branches.

## Verification
- [ ] GitHub CI: `npm run typecheck`, `npm test`, `npm run build`.
- [ ] Vercel preview deploy and exact-host allowlist.
- [ ] Manual test: microphone permission, central-core activation, voice start/stop, interruption, mouth animation.
- [ ] Manual test: image upload and Gemini vision response.

## Separate router/workforce dependency
The repository's Universal AI Router document describes a feature-branch foundation and explicitly says it is not production-enabled. The Vercel project currently has no configured `OPENROUTER_API_KEY`. Specialist workforce API/tool contracts are not yet available in this application. Do not claim the avatar is routed through the universal router or can execute specialist actions until those prerequisites are implemented and verified.
