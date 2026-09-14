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

## Verification Results

- **Unit Tests**: `npm test -- --run` passed with **12 / 12 passing**.
- **Type Checking**: `npx tsc --noEmit` exited with code **0**.
- **Production Build**: `npm run build` compiled cleanly into `dist/assets/`.
- **Dev Server**: Running on `http://localhost:5173/` (HTTP 200 OK).

