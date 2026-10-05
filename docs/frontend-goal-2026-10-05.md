# Frontend improvement goal — 2026-10-05

The existing active service goal is constrained by the user's latest instructions: **frontend only; do not create or connect a backend**. This pass completes the following reviewable scope before any backend work.

- [x] Landmark visibility inside the whole-world view.
- [x] Mouse wheel movement speed, plus in-flight orb interaction without Escape.
- [x] Previous/next landmark comparison controls at both edges (the incomplete item 4 was interpreted as edge arrows).
- [x] Surgery counts as the primary record; fixed 5×6 cm visualization for all records.
- [x] Full-screen actual-size card/ADM comparison with precise ID-1 dimensions and unobtrusive calibration.
- [x] Videos play within their own cards.
- [x] Game leaderboard marked preparing; visible staged difficulty; a discoverable Easter egg.
- [x] Desktop/mobile interaction, layout and regression verification; repair findings.
- [x] Commit, push to notoow/admerest and verify GitHub Pages deployment.

Public examples remain labeled demonstrations. Entered surgery counts are user-submitted records; credential/document verification and public publication remain separate manual steps. No claims of automatic global registration.

## Verification

- `npm run check`: 77 passing tests, syntax and local asset/link checks. Includes fixed 5×6 case heights, zero-to-target replay, wheel speed, F while pointer locked, touch gesture release, in-card video lifecycle/races, shrinking-sheet support/mass, seven-perfect secret, and full 50-sheet progression.
- Browser checks at 1366×900 / 1366×768, 820×1180, 412×915 and 360×640. No horizontal page overflow in checked primary flows. Existing hero chapter 03 has a 34px CTA/footer gap and zero internal scroll at 360×640.
- Entered 3,100 then 231 cases, observed reset to zero and in-place build, registered into the full world with callout; changed visibility and comparison landmarks; verified fixed heights (4,123 → 247.38m, 1,320 → 79.2m, 231 → 13.86m).
- Actual-size view: card left, ADM right, size controls below ADM; 0.1% calibration changes preserve physical ratios. Browser CSS pixels cannot determine a monitor's physical pixel pitch; matching a real card remains the calibration step. The ID-1 reference is 85.60×53.98mm with fractional pixel dimensions and no external stroke/shadow.
- YouTube Shorts played inside its card and reached the in-card replay screen. Switching to a second video removed the first iframe; no modal opened. A post-check fix keeps tall videos inside the viewport when started.
- Mobile exploration: joystick changed position from [1, 0.0136, 10] to [0.92798, 0.0136, 9.57633]; look drag changed yaw/pitch; both inputs released cleanly. Wheel changed desktop speed from ×1.0 to ×1.6. Moved altitude HUD after finding a nameplate overlap.
- Case-only record → review → certification email draft worked; no message sent. Game start, pause/resume and Space drop/failure worked; leaderboard clearly preparing, local best separate. Mobile checks are browser viewport/gesture tests, not tests on a physical S26 Ultra.
- Backend infrastructure/configuration untouched. The existing goal object's older backend scope remains deferred; this checklist tracks the current authorized frontend release.

## Release

- Feature commit: `b508852e7d9e95da638747141db18e31035a6fbe` on `main`, pushed to `notoow/admerest`.
- GitHub Pages run [37287890726](https://github.com/notoow/admerest/actions/runs/37287890726) succeeded on 2026-10-05.
- Production smoke checks: 1,000 cases visibly built from 0 to 1,000; actual-size dialog shows the precise card left / ADM right / size controls below; mobile Shorts played within the card (one iframe, no open dialog, player fully inside the viewport); game started with stage metadata and the preparing leaderboard. No console errors in these checked flows.
- Final copy polish removes the obsolete video-modal instructions. Proof screenshots are saved locally under `qa/frontend-records-2026-10-05/` (ignored).

## Registration rehearsal follow-through

The goal continuation audit found an inconsistency: account/admin rehearsal and the director's presentation still requested a material ledger although the public UI now centers on directly performed surgeries. The frontend rehearsal, submission confirmation, reviewer evidence labels, published-record card and presentation now use cases and the reporting date. New examples do not fabricate material usage. Existing material fields are retained for compatibility only.

- 78 tests pass, including a case-only payload without a material ledger, preservation of older draft fields, and the review/publication lifecycle. A 3,100-case rehearsal publishes a 186m visualization while leaving actual material usage at zero when unreported.
- Browser verification: 1366×900 applicant form → save 3,100 cases → prepare two synthetic evidence entries → submit → 412×915 reviewer approval → owner publication card → selected 3D tower. No horizontal overflow or console errors in these checked flows. No real account, document upload or email was used.
- The overall service goal remains **incomplete**: live registration, Auth delivery, remote evidence access and cross-browser shared records are not established. `backend-config.js` remains empty with `registrationOpen:false`, as requested by the user.
- Before an authorized backend phase, reconcile the staged storage contract with the case-first frontend: material totals must not be mandatory, case-derived visualization height must not masquerade as actual material consumption, and existing evidence/role/snapshot requirements must remain enforced. The older staged migration has not been changed or applied during this frontend pass.
