# NEAS APEX — Project Board

Last updated: 2026-11-22

## Active work

| Project | State | Scope | Next gate |
|---|---|---|---|
| NEAS APEX holographic voice avatar | In verification | Use the supplied blue holographic portrait inside the existing gold core; connect microphone, photo upload, breathing/eye effects and speech-synchronized waveform to the existing ElevenLabs Engineering AI agent. | GitHub CI, Vercel preview, live voice/photo test, exact preview host allowlist. |
| NEAS Universal AI Router + specialist workforce | Blocked — configuration required | Shared OpenRouter-first model routing, provider health/fallback, budget controls, and approved specialist tools. | Configure server-side OPENROUTER_API_KEY and deploy authenticated router/chat endpoints; publish the specialist tool/API contracts and explicit tool allowlist. |

## Completed in this change

- [x] Add the supplied NEAS AI holographic portrait asset.
- [x] Place the avatar and microphone/photo controls in the central gold orb.
- [x] Add idle breathing, eye glow and audio-level-driven mouth waveform.
- [x] Connect microphone and stop controls to the existing ElevenLabs conversation lifecycle.
- [x] Connect photo selection to the ElevenLabs multimodal file-upload and message APIs.
- [x] Configure the NEAS APEX welcome greeting and preserve strict origin-header checks.
- [x] Add a safe public agent/branch configuration endpoint; no API key is returned to the browser.
- [x] Add automated typecheck, test and build checks for pull requests.

## Remaining acceptance gates

- [ ] GitHub CI passes: typecheck, tests and production build.
- [ ] Vercel preview deploys and its exact host is added to the ElevenLabs origin allowlist.
- [ ] Verify live microphone, interruption, speaking animation and photo analysis in the preview.
- [ ] Connect the Universal AI Router only after the server-side OpenRouter credential and router endpoints are configured.
- [ ] Connect specialist tools only after the workforce APIs, scopes, approvals and audit contracts are verified.
- [ ] No automatic merge or production deployment in this change.
