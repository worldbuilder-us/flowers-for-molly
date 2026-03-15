# AGENTS.md

## Purpose
This file is the operating playbook for performance and memory-pressure work in this repository.

The immediate goal is to reduce mobile crashes and bad performance on the garden experience without introducing any regression in visual quality, behavior, content, or features.

This file is written so an agent can be prompted through the work step by step and remain consistent across turns.

## Current Objective
Investigate, measure, and then implement memory-pressure and performance improvements for the home garden scene, especially on mobile.

The current known risks are:
- excessive up-front image loading
- large decoded bitmap memory usage
- too many mounted scene elements at once
- overly broad compositor promotion
- paint-heavy overlay effects
- unnecessary story and audio memory on the home page

## Non-Negotiable Constraints
- Do not remove or weaken any user-facing feature unless the user explicitly approves it.
- Do not reduce experiential quality as a shortcut.
- Do not silently change composition, dot placement, parallax behavior, scroll feel, audio behavior, modal behavior, or content.
- Do not write code before understanding the relevant files and current behavior.
- Do not make speculative performance claims without measuring or clearly labeling them as inference.
- Do not revert unrelated user changes.

## Success Criteria
The work is successful only if all of the following hold:
- mobile memory pressure is materially lower than baseline
- mobile crash likelihood is materially lower than baseline
- initial scene load is lighter
- long scrolls are stable
- first viewport visuals match baseline
- infinite-scroll seam behavior matches baseline
- story dots behave the same from the user’s perspective
- story modal behavior matches baseline
- audio behavior matches baseline from the user’s perspective

## Scope
Primary scope:
- [`/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/page.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/page.tsx)
- [`/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx)
- [`/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryDotsOverlay.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryDotsOverlay.tsx)
- [`/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryDotsOverlay.module.css`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryDotsOverlay.module.css)
- [`/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryModal.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryModal.tsx)
- [`/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryModal.module.css`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryModal.module.css)
- [`/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/Header.module.css`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/Header.module.css)
- [`/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/garden`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/garden)
- [`/Users/shirishsarkar/_CODE/flowers-for-molly/public/garden`](/Users/shirishsarkar/_CODE/flowers-for-molly/public/garden)
- [`/Users/shirishsarkar/_CODE/flowers-for-molly/public/sound`](/Users/shirishsarkar/_CODE/flowers-for-molly/public/sound)

Secondary scope:
- build config and asset pipeline
- profiling helpers
- test notes and rollout notes

## Known Baseline
These values are the current working baseline and should be updated only when fresh measurements are taken.

- `/` production route JS: about `17.3 kB`
- `/` first-load JS: about `121 kB`
- `public/garden`: about `321 MB` compressed PNGs
- referenced unique garden images: `82`
- referenced compressed garden payload: about `209 MB`
- modeled decoded RGBA memory for referenced images: about `867 MB`
- positioned sprite instances per world copy: about `145`
- non-repeating mounted image nodes across 3 segments: about `435`
- stories fetched on home: up to `1000`

## Working Rules Per Turn
For each performance task:
1. Inspect the relevant files first.
2. State the exact change area and intended outcome.
3. Make the smallest coherent change that advances the active phase.
4. Verify locally using the best available measurement.
5. Report what changed, what was verified, and what remains.

If blocked:
1. Say exactly what is blocked.
2. State what was tried.
3. State the narrowest next action needed.

## Required Reporting Format
When working through these tasks, the agent should report:
- active phase
- files being changed
- hypothesis being tested
- verification run
- result
- regression risk, if any

## Performance Principles
- Prioritize reducing memory residency over micro-optimizing JavaScript.
- Prioritize decoded image memory over transfer size alone.
- Prefer viewport-aware loading and mounting over full-scene eager loading.
- Prefer measured compositor improvements over blanket `will-change`.
- Preserve the visual experience by changing delivery strategy before changing art direction.
- Avoid hidden regressions caused by pop-in, seam glitches, shifted layout, or altered interaction timing.

## Phased Plan

### Phase 0: Baseline Instrumentation
Goal:
- establish repeatable measurements before functional changes

Tasks:
- create a simple measurement checklist for desktop and mobile runs
- record baseline for initial load, first interaction, first scroll, long scroll, and modal open/close
- capture metrics where possible from local tooling
- document any limitations when real device profiling is not available

Required outputs:
- baseline notes committed to the working conversation
- any lightweight local profiling hooks the user approves

Do not:
- change behavior unless it is necessary to enable measurement and is clearly temporary

### Phase 1: Reduce Up-Front Memory Pressure
Goal:
- stop loading unnecessary scene, story, and audio resources at startup

Targets:
- `InfiniteParallaxGarden`
- home page data fetch
- story overlay audio setup

Tasks:
- remove or narrow full-scene image preload behavior
- remove blanket eager image loading
- preserve priority for only truly first-viewport-critical assets
- change home story fetch to lightweight metadata where possible
- defer full story content fetch until modal open if API shape allows
- defer secondary audio setup until user interaction actually needs it

Verification:
- lower initial requests and decode count
- lower peak memory during first load and first scroll
- no first-viewport visual regression

### Phase 2: Viewport-Based Scene Virtualization
Goal:
- mount only the scene content that matters for the visible window and a safe overscan buffer

Targets:
- layer rendering path
- scene geometry calculations
- manifest-driven asset placement

Tasks:
- keep infinite-scroll behavior
- keep seam behavior stable
- mount positioned sprites only when they intersect the expanded viewport
- keep sufficient overscan to avoid visible pop-in
- avoid unnecessary duplication of repeated strips

Verification:
- materially lower DOM/image node count
- stable long scroll
- no seam regressions
- no visible pop-in at normal scroll velocity

### Phase 3: Compositor and Layer Cleanup
Goal:
- reduce unnecessary compositing work and backing-surface memory

Tasks:
- remove broad `will-change` usage unless trace data proves value
- target promotion only where it improves scroll smoothness
- review clipped transformed containers for excess layering

Verification:
- fewer compositor layers
- equal or better scroll smoothness
- no parallax or opacity regressions

### Phase 4: Delivery Asset Optimization
Goal:
- preserve art quality while reducing transfer and decoded memory cost

Tasks:
- audit oversized source dimensions relative to render size
- generate delivery-fit assets by scene role and viewport class
- trim transparent bounds where appropriate
- preserve alpha and visual fidelity
- document asset generation rules so new assets follow the same budget

Verification:
- lower compressed size
- lower decoded memory model
- screenshot parity at target desktop/mobile DPRs

### Phase 5: Overlay Paint Optimization
Goal:
- keep the dot and burst experience while reducing paint and compositing cost

Tasks:
- replace shadow-heavy animation patterns with cheaper equivalents where visual parity can be preserved
- tighten particle lifetime and active count only if the same effect can be maintained
- avoid large numbers of simultaneously promoted animated particles

Verification:
- lower paint/composite cost in traces
- same user-perceived interaction quality

### Phase 6: Secondary Cleanup
Goal:
- trim lower-priority overhead once primary memory issues are solved

Tasks:
- review backdrop blurs and similar effects
- keep them only if affordable after major fixes

Verification:
- no UX regression
- measurable benefit or clear justification

## Guardrails For No-Regression Work
Before closing any phase, confirm:
- same first viewport composition
- same scene scale and placement
- same scroll direction and feel
- same touch behavior
- same story dot count and placement logic
- same modal content and close behavior
- same audio affordances

If any of the above changes, stop and report it explicitly.

## Prompt Patterns
Use these as the default interpretation when the user prompts the agent.

If the user says:
- "start phase 0"
  - inspect the current measurement options, establish the best local baseline, and report limitations
- "start phase 1"
  - implement only startup memory-pressure reductions first
- "start phase 2"
  - implement viewport-based mounting without changing scene behavior
- "start phase 3"
  - remove unjustified compositor promotion and verify scroll quality
- "start phase 4"
  - build or document the asset-delivery optimization path
- "start phase 5"
  - optimize overlay paint cost without changing the interaction language
- "start phase 6"
  - perform secondary cleanup only after confirming primary wins
- "report status"
  - summarize completed work, current metrics, open risks, and next recommended step
- "review this phase"
  - prioritize bugs, regressions, and missing validation over summarizing changes

## Best-Practice Editing Guidance
- Favor small, reviewable commits in concept even if the user has not asked for git commits.
- Keep instrumentation and production logic separate.
- Prefer deleting harmful eager work before adding new complexity.
- Add code comments only where the optimization logic would otherwise be hard to understand.
- When adding heuristics, make them explicit and measurable.
- Avoid device sniffing unless there is no better capability-based alternative.
- Prefer deterministic loading rules over ad hoc special cases.

## Measurement Notes
If real mobile profiling is unavailable in the environment:
- use production builds
- collect local build metrics
- inspect asset sizes and decoded-size estimates
- inspect DOM and render structure directly from code
- state clearly that mobile crash conclusions are inferred from memory and rendering structure, not directly device-measured

## Completion Rule
Do not declare the performance problem solved until:
- startup memory work is in place
- mounting strategy is improved
- at least one post-change verification pass shows lower memory pressure
- no regressions are found in first viewport, scrolling, dots, modals, or audio
