# Walkthrough: Sequential Task Communication & Telemetry HUD Redesign

This update addresses two critical operational observations:
1. **Node Active Communication Sequencing**: Connection line particle streams now animate **only during active task execution** following the genuine sequential handoff pipeline (`Orchestrator` ➔ `Design` ➔ `Coder` ➔ `Tester` ➔ `Orchestrator`), resting in a calm quiescent state when idle or completed.
2. **Telemetry Layout Redesign**: Redesigned the hardware metrics monitor and live bandwidth waveform oscilloscope so that no SVG paths, numbers, or footer status items get cut off or clipped.

---

## 1. Active Sequential Communication

### Problem
Previously, particles on all 6 connection channels looped continuously even when tasks were completed (`100%`) or idle (`0%`), giving a noisy "Christmas tree" perpetual motion effect rather than reflecting actual data transfers.

### Solution
- **State-Aware Flow**: Continuous particles on connection lines are **completely disabled** when no task is running (`mission?.status !== 'RUNNING'`).
- **Sequential Pipeline Progression**: When a mission is running, particle flows illuminate **only on the active handoff channel**:
  1. **Stage 1 (Orchestrator Planning & Dispatch)**: Particles flow from `Orchestrator` ➔ `Design` and `Orchestrator` ➔ `Coder`.
  2. **Stage 2 (Design Processing & Spec Contract)**: As Design finishes tokens, communication shifts to the `Design ➔ Coder` negotiation loop.
  3. **Stage 3 (Coder Processing & Implementation)**: When Coder finishes AST transforms, communication shifts to `Coder ➔ Tester`.
  4. **Stage 4 (Tester Auditing & Verification Report)**: When Tester validates regressions, communication flows from `Tester ➔ Orchestrator`.
  5. **Completion**: When the swarm reaches 100%, all continuous particle flows cease and the graph rests in dark HUD equilibrium.
- **Dynamic Event Packets**: Whenever an agent sends a message or completes a task, a single dynamic packet travels along that exact channel to the recipient node, providing visual confirmation of inter-agent messaging.
- **Zero Collision Badges**: Removed the overlapping badge at `(500, 442)` that previously sliced across the Research card. Badges now cleanly sit on open curve segments and illuminate only when their channel is active.

---

## 2. Redesigned Telemetry HUD (Unclipped)

### Problem
The bottom metrics panel had fixed constraints where:
- The waveform sine wave lines terminated abruptly and got clipped at the right and bottom edges.
- The footer text (`Built with Antigravity • Powered by Gemini`) was pushed right against the bottom waveform and clipped.

### Solution
- **Dock Dimensions**: Increased [BottomTelemetryPanel](file:///d:/Projects/Multi%20Agent%20Setup/src/components/BottomTelemetry/BottomTelemetryPanel.tsx) height to `240px` and metrics panel width to `335px` with dedicated flex spacing.
- **Live Signal Monitor / Oscilloscope Screen**:
  - Encased in a dedicated dark bezel card (`rgba(0, 0, 0, 0.55)`) with subtle HUD grid lines and header tag `LIVE BANDWIDTH HARMONIC • 0.0% COLLISION`.
  - SVG `viewBox="0 0 300 36"` with smooth cubic Bezier harmonic waves strictly bounded between `y=8` and `y=28`, with soft phosphor gradient area fill under the curve.
  - Zero jagged fragments or clipped stroke boundaries.
- **Dedicated Footer Status Bar**:
  - Fixed `26px` bar with solid dark background (`rgba(6, 10, 18, 0.98)`), distinct top border, and clean flex alignment:
    - Left: `● System Online • 4/4 Agents Active`
    - Right: `Built with Antigravity • Powered by Gemini`
  - Completely separate from the metrics panel so text never collides or gets overlapped.

---

## Verification Results
- **Unit Tests**: `npm test -- --run` passed with **12 / 12 passing**.
- **Type Checking**: `npx tsc --noEmit` exited with code **0**.
- **Production Build**: `npm run build` compiled cleanly.
- **Dev Server**: Active on `http://localhost:5173/` responding with **HTTP 200 OK**.
- **Git Commit**: Committed (`29a349d`) and pushed to `origin/main`.
