# Walkthrough: Floating Agent Menu Pop-up Side-by-Side with Agent Card

This update refactors the agent inspection menu from a docked edge panel/drawer into a dynamic, glassmorphic **floating pop-up menu anchored directly beside the clicked agent card** on the mission canvas.

---

## 1. Floating Pop-up Menu Architecture

- **Side-by-Side Anchoring Engine**:
  - Replaced the legacy fixed edge drawer (`position: fixed; right: 0`) with a floating popover anchored right inside [.multi-agent-graph-canvas](file:///d:/Projects/Multi%20Agent%20Setup/src/components/AgentGraph/AgentGraph.tsx).
  - Implemented `getNodeContainerPixelPos(agentId)` using `svg.createSVGPoint()` and `svg.getScreenCTM()` to compute the exact sub-pixel screen coordinates of the selected agent node.
  - **Smart Directional Placement**:
    - **Nodes on left half** (e.g. Design `@design`, Research `@research`): Floating menu appears directly on the **right** side of the card (`left = cardCenterX + cardHalfW + 16px`).
    - **Nodes on right half** (e.g. Coder `@coder`, Tester `@tester`): Floating menu appears directly on the **left** side of the card (`left = cardCenterX - cardHalfW - popupWidth - 16px`).
    - **Apex Orchestrator** (center): Placed adjacent side-by-side with boundary clamping.
  - **Boundary Clamping**:
    - Clamps `left` and `top` within `[10px, containerWidth/Height - 10px]`, guaranteeing the pop-up never overflows the canvas borders.
  - **Real-Time Drag Synchronization**:
    - As an agent node is dragged across the canvas, the floating pop-up menu glides smoothly side-by-side with the card in real time!

---

## 2. Visual Design & Refinements

- **Glassmorphic Theme**:
  - `background: rgba(8, 14, 26, 0.98); backdrop-filter: blur(28px);`
  - Border and ambient drop glow dynamically inherit the active agent's role color (`var(--insp-role-color)`): purple for Design, cyan for Orchestrator, emerald for Coder, orange for Research, and rose for Tester.
- **Directional Pointer Notches**:
  - Added triangular indicator notches on [.agent-inspector-drawer.is-floating[data-placement="right"]](file:///d:/Projects/Multi%20Agent%20Setup/src/components/AgentInspector/AgentInspector.css) and `[data-placement="left"]` that point directly to the adjacent card.
- **Controls & Sections**:
  - **Header**: Role badge, `@agentId`, and close button `[X]`.
  - **Assigned Model Dropdown**: Allows instant mid-run model swapping (`Gemini 1.5 Pro`, `Claude 3.5 Sonnet`, `GPT-4o`, `Llama 3.1 405B`, `Sonar Deep Research`) with instant pricing recalculation.
  - **Control Action Buttons**: `[> RESUME]` / `[|| PAUSE]`, `[⟲ RETRY]`, `[□ KILL]`.
  - **Token & Cost Tracking**: Prompt tokens, Completion tokens, Total tokens, and Estimated spend.
  - **Resource Allocation**: CPU usage %, Memory alloc MB, Progress %, State (`COMPLETED` / `WORKING`).
  - **Active Assignment**: Task title and current action description.
  - **Direct Operator Directive**: Direct input to dispatch custom prompts to the agent.
  - **Activity Stream**: Timestamped live logs for the agent.

---

## 3. Interaction & Dismissal

- **Click to Open**: Clicking any agent node on the canvas immediately opens its floating menu pop-up at that spot.
- **Close Button**: Clicking the `[X]` button on the floating header cleanly closes the menu.
- **Canvas Click-to-Dismiss**: Clicking anywhere on the empty canvas backdrop dismisses the floating pop-up.
- **Escape Key**: Pressing `Escape` on the keyboard instantly closes the floating menu.
- **Stop Propagation**: All interactions within the floating pop-up (changing model, scrolling, typing directives, clicking buttons) do not trigger canvas drag or deselection.

---

## 4. Sidebar View Navigation & Dedicated Workspace Views

Previously, clicking sidebar items like **Files**, **Git**, or **Settings** triggered modal dialogs while leaving the background in Mission Control. We have now upgraded the sidebar navigation to provide dedicated, full-screen workspace views for all 6 tabs:

- **Mission Control (`mission`)**:
  - Live Directive input, Multi-Agent Model Topology Graph (`AgentGraph`) with floating agent inspectors, DAG progress, and compact cards.
- **Agents (`agents`)** ([AgentsView.tsx](file:///d:/Projects/Multi%20Agent%20Setup/src/components/Views/AgentsView.tsx)):
  - Dedicated Swarm Roster dashboard displaying all 5 agents (`orchestrator`, `design`, `coder`, `research`, `tester`) with expanded operational telemetry, sparkline history, and global control actions (`Resume Swarm`, `Pause Swarm`, `Stop Swarm`).
- **Tasks (`tasks`)** ([TasksView.tsx](file:///d:/Projects/Multi%20Agent%20Setup/src/components/Views/TasksView.tsx)):
  - Dedicated Task Pipeline & DAG Board showing active task flows, dependencies, execution progress %, duration, and outputs.
- **Files (`files`)** ([FilesView.tsx](file:///d:/Projects/Multi%20Agent%20Setup/src/components/Views/FilesView.tsx)):
  - Full-featured **Workspace Files & Unified Diff Explorer**:
    - Filterable file tree categorization (Modified, Added, Deleted, Untracked files).
    - Unified diff inspector with copy button and syntax formatting.
    - Inline commit deck to stage and commit changes directly.
    - WorkspaceSafety guard status (.git, node_modules, package.json, .env protected).
- **Git (`git`)** ([GitView.tsx](file:///d:/Projects/Multi%20Agent%20Setup/src/components/Views/GitView.tsx)):
  - Version control dashboard showing active branch, Ahead/Behind tracking, change counters, commit history timeline, and commit creation form.
- **Settings (`settings`)** ([SettingsView.tsx](file:///d:/Projects/Multi%20Agent%20Setup/src/components/Views/SettingsView.tsx)):
  - Configuration panel for AI provider endpoints (Google Antigravity Native, Anthropic Claude, OpenAI, Local Ollama), workspace paths, concurrency limits, and safety rules.

---

## 5. Enhanced High-Fidelity Text Diagrams & Visual Schematics

The project's [README.md](file:///d:/Projects/Multi%20Agent%20Setup/README.md) has been upgraded with 10 comprehensive, high-fidelity ASCII/Unicode visual schematics:

1. **Mission Control HUD & Topology Canvas** (Section 1):
   - Real-time mission stats bar, timer, speedup multiplier, spend tracking, left navigation deck, central topology canvas with Bezier splines and throughput badges (`12 KB/s`, `28 KB/s`, `44 KB/s`), live directive feed with timestamps, and bottom oscilloscope waveform.
2. **Architectural Runtime Stack** (Section 1.1):
   - React 18 Renderer, Electron IPC Main Process, Core Agent Runtime (EventBus, DAG Scheduler, WorkspaceSafety, Model Router), and Native File System / Git bridges.
3. **NASA Swarm Topology Network Map** (Section 2):
   - Apex Level 1, Mid-Level 2 (Design & Coder with bi-directional spec negotiation), and Leaf Level 3 (Research & Tester) with exact spatial layout and color identities.
4. **6-Stage Autonomous Execution Pipeline** (Section 3):
   - Intent Ingestion ──► DAG Decomposition ──► Concurrent Dispatch ──► Contract Negotiation ──► Verification Runners ──► Workspace Safety & Git Persistence.
5. **Concurrency Benchmark Gantt Chart** (Section 3.1):
   - Compares traditional sequential execution (~48.0s) against ACC parallel swarm execution (~17.5s, **2.74x speedup**).
6. **Agent Operational Lifecycle & State Machine** (Section 4):
   - Full state transitions: `IDLE` ──► `QUEUED` ──► `WORKING` ──► `WAITING_IO` / `COLLISION` / `FAILED` ──► `RESOLVED` / `RETRY` ──► `COMPLETED` ──► `SYNTHESIZED`.
7. **Side-by-Side Floating Pop-up Menu Geometry** (Section 6):
   - Shows both **Orientation A** (card on left, pop-up to right with `◀───` notch) and **Orientation B** (card on right, pop-up auto-flips to left with `───►` notch), complete with model dropdown, action buttons, token spend matrix, CPU sparklines (`▃▅█▃▅▆▇`), and direct directive prompt input.
8. **Central Workspace View Switcher Wireframes** (Section 7):
   - Visual mockups of all 6 dedicated workspace views (`Mission Control`, `Agents Roster`, `Tasks DAG`, `Files Explorer`, `Git Version Control`, and `System Settings`).
9. **AST Line-Span Collision Detection & 4-Way Arbitration** (Section 9):
   - Illustrates Coder lines 40-55 and Design lines 48-62 colliding on lines 48-55 of `src/theme.css`, and details the 4 resolution options (`KEEP CODER`, `KEEP DESIGN`, `3-WAY SMART MERGE`, `ORCHESTRATOR SYNTHESIS`).
10. **Central Typed EventBus & IPC System Architecture** (Section 10):
    - Asynchronous message exchange connecting Agent Threads, WorkspaceSafety, UI Controllers, and Electron IPC.

---

## Verification Results

- **Unit Tests**: `npm test -- --run` passed with **12 / 12 passing**.
- **Type Checking**: `npx tsc --noEmit` exited with code **0** errors.
- **Production Build**: `npm run build` compiled cleanly into `dist/assets/`.
- **Git Remote**: Changes committed and pushed to `origin/main` (`8cd5e7c`).
- **Dev Server**: Running on `http://localhost:5173/` (HTTP 200 OK).

