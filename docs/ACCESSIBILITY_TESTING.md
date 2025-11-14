# Accessibility testing guide: verifying the DRAFT print watermark is decorative

This guide explains quick, repeatable ways to validate that the print-only watermark node is decorative and does not interfere with screen reader output.

What we expect

- The DRAFT watermark is present in the DOM only when isDraftAgreement is true.
- It has aria-hidden="true", making it non-exposed to assistive technologies.
- Screen readers do not announce it and it does not affect the virtual cursor order.
- It is hidden on screen (display: none) except in print context; many tools expose the Accessibility Tree even if the element is hidden visually, so aria-hidden remains the key signal to ATs.

1. Verify in browser DevTools (no screen reader needed)
   Chrome/Edge

- Open the page where the watermark is rendered (state where isDraftAgreement is true). You don’t need to open Print Preview for this check.
- Open DevTools → Elements, select the <div class="print-watermark" aria-hidden="true"> node.
- Switch to the "Accessibility" pane (right sidebar).
  - Name: should be none
  - Role: generic or none
  - Computed properties: aria-hidden: true
  - "Excluded from accessibility tree" should be displayed. If visible, this confirms it will not be exposed to screen readers.
    Firefox
- Open Developer Tools → Accessibility panel. Click the "Pick an accessible object" tool and hover the watermark element in the DOM tree. Verify it does not appear in the accessibility tree because of aria-hidden.

2. Manual screen reader checks
   Notes

- Do these without Print Preview open (most SRs ignore print preview UIs). We only need to ensure the presence of the node (in DOM) does not alter announcements.
- Focus on navigating around the area where the banner and heading appear. The watermark should never be announced.

NVDA (Windows, free)

- Start NVDA.
- Use Firefox or Chrome. Navigate to the view-agreement page where the draft banner is shown.
- Use H to jump between headings. Expected: announcements for page title and any headings, but no announcement of "DRAFT".
- Use D to jump by landmarks/regions and B to jump by buttons/links. Expected: normal landmarks/links; watermark not announced.
- Use NVDA+F7 (Elements list). Search for the word "draft". Expected: not present (only real text content like the notification message may contain the word "draft", but the watermark node itself should not appear).

VoiceOver (macOS)

- Turn on VoiceOver (Cmd+F5).
- Use Safari or Chrome.
- Use VO+U to open the rotor, check the headings/landmarks lists. Expected: watermark not present.
- Browse the content with VO+Right/Left. Expected: No announcement of the decorative watermark.

JAWS (Windows, commercial)

- Use H to move between headings, R to regions, and virtual cursor arrows to read through content. Expected: no watermark announcement.
- Use JAWS Find (Ctrl+F) to search for "DRAFT". Expected: the decorative node is not surfaced as an accessible object; only real textual content may be found.

3. Programmatic checks (optional, CI)
   You can add automated assertions that the watermark is excluded from the Accessibility Tree and that aria-hidden is present.

Option A: Axe (browser automation)

- With Playwright or Puppeteer and axe-core:
  - Render the page state where the watermark appears.
  - Run axe and ensure there are no violations for aria-hidden focusable content (our watermark has pointer-events: none and no focus, so this is safe).
  - Optional: query the DOM for .print-watermark and assert it has aria-hidden="true".

Option B: pa11y/pa11y-ci

- Run pa11y against a locally running instance. Ensure no violations concerning hidden content or non-text contrast are raised (watermark uses low-contrast color and is decorative-only).

Suggested unit/integration assertion (fast check)

- Add a server-render test (if you render templates in tests) that ensures the watermark element includes aria-hidden="true" when isDraftAgreement is true, and is absent when false.
- You don’t need to simulate print media in tests; the accessibility guarantee comes from aria-hidden rather than CSS.

4. Troubleshooting tips

- If "Excluded from accessibility tree" is not shown, ensure the node includes aria-hidden="true" and isn’t focusable (no tabindex, no interactive role, pointer-events: none).
- Confirm no aria-label, aria-labelledby, or role attributes were added that might surface it.
- Ensure no ancestor sets aria-hidden=false while a descendant sets aria-hidden=true inconsistently; the inner aria-hidden still hides that subtree in modern ATs, but keep it simple.
- Don’t use role="img" + aria-label for decorative watermarks; prefer aria-hidden="true".

5. Why we didn’t make a print-preview SR test

- Screen readers typically don’t interact with print preview surfaces; what matters is ensuring the source DOM node is hidden from the accessibility tree. The CSS print media changes only visual output.

Acceptance checklist

- [ ] Watermark node has aria-hidden="true" in the DOM.
- [ ] Accessibility pane shows the node is excluded from the accessibility tree.
- [ ] NVDA/VoiceOver/JAWS navigation does not announce the watermark.
- [ ] Optional automation (axe/pa11y) reports no violations related to the watermark.
