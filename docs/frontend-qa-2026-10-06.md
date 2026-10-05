# Mobile flow follow-through — 2026-10-06

Frontend-only QA following the user's go-ahead. No backend configuration, infrastructure, accounts, uploads or email transmission changed.

## Findings and repairs

- At 360×640, registering a tower previously put the certification buttons below the viewport (placement bottom ~693px). The two-row toolbar and in-scene callout consumed the viewing area. The toolbar now fits one row, the callout follows the scene without covering a tower, and the registered view fits the viewport. Its final bottom is ~624px with the header still visible. Desktop uses a compact horizontal callout and a height-aware scene.
- The location button now brings the scene back into view, not just its camera. Scrolling waits one animation frame for the changed controls/layout before choosing its destination. The duplicate toast was removed so it cannot cover the certification controls.
- The startup module hardcoded an old versioned app import, bypassing the page's updated import map. It now imports the canonical module through that map, and changed entrypoints/assets have fresh versions so returning visitors receive the fixes.
- A held joystick used the pad's old rectangle after mobile browser chrome resized the viewport. The next event now rebases the gesture while preserving its analog direction/speed; following deltas still steer, release stops, and a new press uses the current pad center. Added a regression for both relocation and resizing.
- The presentation page now leads with an actionable three-minute visitor demo: build 3,100 cases, walk through the world, then compare material sizes/watch inline videos. Account/reviewer rehearsal remains a separate optional walkthrough, clearly distinguished from live publication.

## Verification

- Final `npm run check`: 79 passing tests plus JavaScript syntax and local asset/link validation.
- Browser UI: Enter submission releases input focus; 3,100 cases build in place; explicit registration reveals the full world and certification CTA; the CTA opens the correct email guidance without sending anything. Verified the landmark drawer and return-to-tower navigation.
- Mobile browser gestures at 412×915: joystick moved [1, 0.0136, 10] to [0.93137, 0.0136, 9.59631]; look drag changed yaw/pitch; release reset the joystick. Landscape 915×412 retained visible navigation, movement controls and exit without horizontal overflow.
- Layout checks include 360×640, 412×915, and 1366×768/900. The final scene/callout ends at ~624px on the 640px phone viewport and ~760px on the 768px desktop viewport. Opening/closing the landmark drawer and locating the tower again returns the mobile scene to ~124px, below the sticky header. Proof screenshots are kept locally under `qa/mobile-flow-2026-10-06/` (ignored).
- Physical S26 Ultra was not tested. Device inventory exposed Bluetooth audio only, with no available Android debugging/browser connection. Browser viewport/gesture checks and synthetic simultaneous-pointer regressions do not establish actual handset performance.
- The existing backend goal remains deferred. `backend-config.js` still has empty connection fields and `registrationOpen:false`.
