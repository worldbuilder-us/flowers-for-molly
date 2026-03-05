# Performance Optimization Ticket Prompts

This document contains copy-paste prompts you can feed back to me one ticket at a time.

## Global constraints for all tickets

These constraints are mandatory and must be repeated in every ticket execution:

1. Preserve current experience and behavior exactly.
2. Optimize only; no feature removals.
3. Desktop performance must not regress.
4. Keep parity for biome order, visual composition, story dot placement logic, modal behavior, and controls.
5. Provide evidence for before/after impact and regression checks.

## PERF-00 prompt

```text
Start PERF-00.

Scope:
Create a baseline and experience lock document for current behavior and performance before any optimization work.

Constraints:
Preserve current experience and behavior exactly.
No feature removals or UX simplification.
Do not implement optimizations in this ticket.
Desktop performance must not regress in later tickets; baseline must include desktop and mobile.

Deliverables:
1. Add/update a baseline doc in the repo that captures:
- Current interaction invariants (scroll feel, parallax character, biome order, story-dot behavior, modal/audio behavior).
- Current visual invariants (no intentional art/layout changes).
- Current technical invariants (world width, biome offsets, wrap behavior as-is).
2. Capture and report current performance baseline metrics (before):
- Scroll FPS/frame pacing snapshot.
- Main-thread workload indicators.
- Image/memory pressure indicators.
- Notes on mobile crash/reload reproduction steps.
3. Provide a concise summary in your response:
- What you measured.
- Exact files added/changed.
- Any gaps or assumptions.

Validation:
Run any relevant local checks you can without changing behavior.
If a metric cannot be directly measured in this environment, state it clearly and provide the closest reliable proxy.

Output format:
- Findings summary
- Files changed
- Baseline metrics table
- Risks/unknowns
```

## PERF-01 prompt

```text
Start PERF-01.

Scope:
Instrument and prove the root cause of the deterministic forest midpoint reload/reset/white-gap issue.

Constraints:
Preserve current experience and behavior exactly.
No fixes in this ticket beyond lightweight diagnostics that can be removed cleanly.
Do not alter visual output or interaction behavior.

Deliverables:
1. Reproduction protocol:
- Exact step-by-step path to trigger the issue on desktop and mobile.
- Approximate logical position/offset where reset occurs.
2. Root-cause evidence:
- Trace scroll/wrap values before and after the event.
- Show which code path triggers position jump/reset behavior.
- Show which rendering/culling condition causes left-side blanking.
3. Diagnostic report:
- Primary cause.
- Contributing causes.
- Confidence level for each hypothesis.
4. Cleanup:
- Remove temporary instrumentation if it is not needed for future tickets.

Validation:
Confirm reproduction happens reliably before instrumentation and still happens after instrumentation.
Confirm no behavior changes introduced by this ticket.

Output format:
- Reproduction steps
- Root-cause evidence (with file references)
- Confirmed causes vs ruled-out causes
- Files changed
- Risks/unknowns
```

## PERF-02 prompt

```text
Start PERF-02.

Scope:
Fix scroll-wrap discontinuity so forest traversal no longer appears to reload/reset, while preserving the current infinite-scroll experience.

Constraints:
Preserve existing interaction feel and visual composition.
No change to world content, biome order, or story placement behavior.
No desktop regressions in smoothness or correctness.

Deliverables:
1. Implement wrap continuity fix:
- Eliminate visible jump/reset at forest midpoint.
- Eliminate transient white blank region during wrap.
2. Keep infinite illusion:
- Scroll should still feel continuous in both directions.
- No visible seams introduced by wrap logic changes.
3. Add brief code comments where logic is non-obvious.
4. Provide before/after evidence:
- Traversal video/gif notes or trace summary.
- Frame pacing observations.

Validation:
Run relevant checks.
Manually validate repeated traversals through full world loop.
Confirm story dots and click targets remain aligned after fix.

Output format:
- What changed
- Why it fixes the issue
- Before/after behavior
- Files changed
- Risks/unknowns
```

## PERF-03 prompt

```text
Start PERF-03.

Scope:
Stabilize viewport-resize and mobile browser UI-bar effects so user position does not reset or drift during normal device UI changes.

Constraints:
Preserve current behavior and look.
Do not change intended initial spawn location.
No feature removals.

Deliverables:
1. Prevent unintended reinitialization on resize/scale updates.
2. Preserve logical user position across:
- Mobile address bar show/hide.
- Orientation changes.
- Dynamic viewport height shifts.
3. Keep desktop resize behavior sane and non-jumpy.
4. Provide before/after evidence for at least two resize scenarios.

Validation:
Run relevant checks.
Confirm no regressions to first-load positioning and initial welcome overlay flow.

Output format:
- Root issue addressed
- Implementation summary
- Before/after behavior notes
- Files changed
- Risks/unknowns
```

## PERF-04 prompt

```text
Start PERF-04.

Scope:
Reduce scroll hot-path React rerender pressure in garden rendering and viewport propagation without changing visuals or behavior.

Constraints:
Preserve current scene composition and interaction.
No behavioral changes to scrolling controls.
No regression in story dot interaction or modal opening.

Deliverables:
1. Remove or reduce full-tree rerenders during scroll.
2. Keep viewport updates accurate for overlays while minimizing state churn.
3. Ensure debug modes still work when enabled.
4. Provide measurable before/after:
- React commit frequency.
- Main-thread activity during continuous scroll.
- User-perceived smoothness.

Validation:
Run relevant checks.
Confirm parity for:
- story dot positions
- pointer behavior
- modal interactions

Output format:
- Optimization approach
- Metrics before/after
- Behavior parity checks
- Files changed
- Risks/unknowns
```

## PERF-05 prompt

```text
Start PERF-05.

Scope:
Tune compositing/layer strategy (including will-change usage) to reduce GPU memory pressure and improve stability, especially on mobile.

Constraints:
Preserve visual fidelity and parallax feel.
Do not flatten or remove layers in a way that changes artistic output.
No desktop regressions.

Deliverables:
1. Audit and optimize layer promotion strategy.
2. Remove unnecessary persistent compositor hints.
3. Keep transform animations smooth under current scroll behavior.
4. Provide before/after evidence:
- GPU memory pressure proxy observations.
- Scroll smoothness and dropped-frame proxy observations.

Validation:
Run relevant checks.
Manually verify no z-order, clipping, or opacity regressions in all visible bands.

Output format:
- Compositing changes made
- Why they help
- Before/after observations
- Files changed
- Risks/unknowns
```

## PERF-06 prompt

```text
Start PERF-06.

Scope:
Perform an asset budget pass for meadow + forest to reduce decode/memory cost while preserving current art direction and scene behavior.

Constraints:
Preserve perceived visuals and composition.
No asset removals that change scene content.
Optimize formats/resolutions/variants only.

Deliverables:
1. Define asset budget targets by device class (mobile and desktop).
2. Identify high-cost assets and optimize them.
3. Ensure manifest references remain correct.
4. Provide before/after:
- Total compressed footprint for active assets.
- Estimated decoded memory footprint for active assets.
- Notes on visual parity checks.

Validation:
Run relevant checks.
Confirm all referenced assets load without 404.
Confirm no obvious quality regressions at intended render sizes.

Output format:
- Budget targets
- Assets changed and rationale
- Before/after asset metrics
- Files changed
- Risks/unknowns
```

## PERF-07 prompt

```text
Start PERF-07.

Scope:
Improve image loading strategy and decode scheduling so traversal is smoother and less crash-prone, without changing scene behavior.

Constraints:
Preserve current UX and visual output.
No removal of content.
No desktop regressions.

Deliverables:
1. Improve loading prioritization for near-viewport assets.
2. Reduce decode spikes during biome traversal.
3. Keep story overlay interaction unaffected.
4. Provide before/after evidence:
- Scroll hitching observations.
- Loading/decode behavior summary.

Validation:
Run relevant checks.
Confirm no missing images during normal traversal.
Confirm behavior parity for story clicks and modal opens.

Output format:
- Loading strategy changes
- Measured impact
- Behavior parity checks
- Files changed
- Risks/unknowns
```

## PERF-08 prompt

```text
Start PERF-08.

Scope:
Optimize StoryDotsOverlay paint/animation cost while preserving the exact interaction model and visual feel.

Constraints:
Preserve dot placement logic and click behavior.
Preserve particle effect intent and overall look.
No feature removal.

Deliverables:
1. Reduce overlay rendering/animation overhead.
2. Maintain current hover/tap affordances and modal behavior.
3. Keep audio feedback behavior unchanged.
4. Provide before/after evidence:
- Overlay-related main-thread/paint proxy metrics.
- Interaction parity notes.

Validation:
Run relevant checks.
Confirm no regressions in dot visibility, tooltip behavior, particle triggering, and click accuracy.

Output format:
- What was optimized
- Why it is safe for UX parity
- Before/after evidence
- Files changed
- Risks/unknowns
```

## PERF-09 prompt

```text
Start PERF-09.

Scope:
Harden biome seam continuity so transitions never look like a reload and traversal feels continuous in both directions.

Constraints:
Preserve current world experience and artistic style.
No changes that alter content meaning or user flow.
No desktop regressions.

Deliverables:
1. Ensure seam continuity between biome boundaries.
2. Decide and implement transition strategy using existing transition manifests or equivalent continuity logic.
3. Validate no repeat seam artifacts at wrap boundaries.
4. Provide before/after evidence for boundary traversal.

Validation:
Run relevant checks.
Manually traverse across all boundaries multiple times in both directions.

Output format:
- Seam strategy chosen
- Implementation summary
- Before/after traversal behavior
- Files changed
- Risks/unknowns
```

## PERF-10 prompt

```text
Start PERF-10.

Scope:
Produce final regression and performance report after PERF-00 through PERF-09, and confirm no UX degradation.

Constraints:
Report must explicitly verify preservation of current experience.
Include both mobile and desktop outcomes.
Be explicit about any residual risks.

Deliverables:
1. Final before/after comparison:
- Performance metrics summary by ticket.
- Mobile crash/reload issue status.
- Desktop regression check status.
2. Regression checklist:
- Visual parity.
- Interaction parity.
- Data/story interaction parity.
3. Risk and rollback notes:
- Any unresolved risks.
- Suggested follow-up tickets if needed.

Validation:
Run relevant checks and summarize outcomes.
If any check cannot run locally, state it and provide fallback verification method.

Output format:
- Executive summary
- Metrics comparison table
- Regression checklist
- Residual risks and next actions
```

