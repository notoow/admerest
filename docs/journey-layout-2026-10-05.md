# Journey UI overlap correction

The previous spacing-only patch did not remove the hidden scroll container. The oversized panorama extended the scrollable overflow of `.journey-stage`; focusing or selecting controls could scroll that container even though its scrollbar was hidden. In the browser, the stage had `scrollTop: 38.4` and the topline moved behind the fixed header.

## Changes

- Use `overflow: clip` to clip the scene without creating an inner scroll range.
- Group each chapter into introduction, measurement and actions. All chapters contribute their intrinsic height to the same grid row; inactive chapters remain invisible and inert.
- Place scroll guidance and chapter controls in a separate, bordered footer row, with real space for the CTA and its pulse.
- Measure the real header height. If the content cannot fit below it, use ordinary page flow; chapter selection remains available and resize preserves the visible chapter.
- Use two columns on wide, short screens, and prevent tiny-screen header links from breaking into multiple lines.

## Verification

- Browser interaction at 320×568, 360×640, 412×915, 820×700, 915×412 and 1366×768. No intersections between the topline, introduction, measurement, action and footer rectangles, and no horizontal page overflow.
- 320×568 and 915×412 use ordinary page flow so the footer can be reached by scrolling. Larger viewports retain the scroll journey.
- At 360×640, the corrected topline starts at 117px below the 99px header; the footer ends at 622px. The action/footer gap is 34px.
- Chapter changes, resize across the fallback boundary, entry into exploration and return all checked. Stage scrollTop remains zero; no browser console errors were observed.
- `npm run check`: 72 passing tests, including header-aware chapter navigation, fallback selection and resize recovery. Browser viewport emulation, not a physical phone test.
