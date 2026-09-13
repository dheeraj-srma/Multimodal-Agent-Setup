# 🛸 Agent Command Center (ACC)

> **NASA Mission Control × Modern Developer IDE × AI Agent Swarm × JARVIS**

A real desktop mission-control interface for running, visualizing, and coordinating multiple specialized AI coding and research agents in parallel.

---

## 🏛 System Architecture

The **Agent System is the source of truth**. The UI is a real-time visualization subscribing to the central, typed EventBus.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DESKTOP / ELECTRON RUNTIME                         │
│                                                                             │
│  ┌─────────────────────────────────┐   IPC Bridge   ┌────────────────────┐  │
│  │     REACT 18 RENDERER (VITE)    │ ◄────────────► │   ELECTRON MAIN    │  │
│  │                                 │                │                    │  │
│  │ - Mission Control Top Bar       │                │ - App Lifecycle    │  │
│  │ - Visual Agent Swarm Graph      │                │ - Native Git CLI   │  │
│  │   (Animated Travelling Packets) │                │ - Local File I/O   │  │
│  │ - 4 Live Agent Cards            │                │ - Persistent Store │  │
│  │ - Dynamic DAG Task Graph        │                │ - Process Spawning │  │
│  │ - Monospace Activity Stream     │                │                    │  │
│  │ - Selected Agent Inspector      │                └─────────┬──────────┘  │
│  │ - Side-by-Side Conflict Resolver│                          │             │
│  │ - Git Diff & Commit Modal       │                          ▼             │
│  │ - Final Mission Report Modal    │                ┌────────────────────┐  │
│  └─────────────────────────────────┘                │ CORE AGENT RUNTIME │  │
│                                                     │                    │  │
│                                                     │ - Central EventBus │  │
│                                                     │ - DAG Scheduler    │  │
│                                                     │ - Conflict Guard   │  │
│                                                     │ - Git Manager      │  │
│                                                     │ - AI Engine/Local  │  │
│                                                     └─────────┬──────────┘  │
└───────────────────────────────────────────────────────────────┼─────────────┘
                                                                ▼
                     ┌──────────────────────────────────────────────────────┐
                     │              5 SPECIALIZED AGENTS                     │
                     ├──────────────────────────────────────────────────────┤
                     │ 🧠 Orchestrator Master Agent (Decomposition & DAG)   │
                     │ 🎨 Design Agent (UI/UX Analysis & Styling Specs)     │
                     │ 💻 Coder Agent (Code Implementation & Refactoring)   │
                     │ 🔬 Research Agent (Tech Approaches & Structured Rec) │
                     │ 🧪 Test / Review Agent (A11y, Performance, Quality)  │
                     └──────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

### 1. 🧠 Autonomous Orchestrator & Dynamic DAG
- Decomposes high-level objectives (e.g. *"Audit this project and identify improvements to UI, architecture, performance and accessibility"*) into dynamic task graphs.
- **Parallel Dispatch**: Independent tasks (Research, Design, Performance audit) run simultaneously in parallel.
- **Dependency Resolution**: Dependent tasks (Implementation, Final Verification) automatically wait until prerequisites are satisfied.
- Synthesizes final comprehensive mission markdown report.

### 2. ⚡ Real-Time Concurrency & Parallelism Tracking
- Dynamic wall-clock tracking: Calculates actual real-time concurrency multiplier:
  $$\text{Parallelism} = \frac{\sum t_{\text{agent}}}{t_{\text{mission}}}$$
- Achieved **1.62x - 3.7x** measured speedup on multi-task missions.

### 3. 📡 Central Typed EventBus & Animated Data Packets
- Typed event architecture: `AGENT_STARTED`, `AGENT_STATUS`, `AGENT_PROGRESS`, `AGENT_LOG`, `AGENT_MESSAGE`, `FILE_CHANGED`, `TASK_CREATED`, `TASK_COMPLETED`, `TASK_FAILED`, `TEST_RESULT`, `CONFLICT_DETECTED`.
- **Animated SVG Data Packets**: Visual nodes show glowing particles travelling between agents strictly upon genuine message and task dispatch events.

### 4. 🛡 Safe Shared Workspace & Collision Detection
- Tracks file modification line spans in real time.
- Detects concurrent line/file collisions between agents.
- **Interactive Conflict Resolver**:
  - Side-by-side diff preview.
  - Options: `KEEP DESIGN`, `KEEP CODER`, `3-WAY MERGE`, `ASK ORCHESTRATOR`.

### 5. 🐙 Git Integration
- Real git status: branch name, uncommitted file counters (`+added, ~modified, ?untracked`).
- Unified diff viewer.
- Orchestrator/operator commit creator with descriptive messages.

### 6. 💾 Persistence & Recovery
- Local persistent storage engine (WAL / atomic storage) in `.acc-data/` and `localStorage`.
- Persists missions, tasks, event logs, agent states, and reports across restarts.

### 7. 🔌 Multi-Provider AI + Built-In Local Intelligence Engine
- Supports **Google Gemini**, **OpenAI**, **Claude**, and **Ollama** via Settings.
- Includes the built-in **ACC Local Intelligence Engine** providing real static code analysis, AST checks, accessibility (WCAG 2.1) audits, and heuristic benchmarking even without external API keys.

---

## 📦 How to Launch

### 1. Run Development Server
```bash
npm run dev
```
Access the visual dashboard at `http://localhost:5173`.

### 2. Run Desktop Application (Electron)
```bash
npm run desktop
```
Launches the native Electron desktop application with native windowing and IPC bridge.

### 3. Build for Production
```bash
npm run build
```
Compiles both the React frontend and Electron main/preload processes with zero errors.

### 4. Run Automated Verification Tests
```bash
npm test
```
Executes the comprehensive verification test suite validating:
- EventBus delivery
- Conflict detection and resolution
- Parallelism calculation
- Dynamic DAG decomposition
- Swarm concurrent execution and report synthesis

---

## 🧑‍💻 Agent Roles

| Agent | Icon | Role & Focus |
|---|---|---|
| **🧠 Orchestrator** | `Brain` | Objective analysis, DAG construction, routing, conflict resolution, report synthesis |
| **🎨 Design** | `Palette` | UI/UX hierarchy, design tokens, color contrast, component specifications |
| **💻 Coder** | `Code` | Feature implementation, refactoring, pre-modification inspection, minimal deltas |
| **🔬 Research** | `FlaskConical` | Technical approaches, library benchmarks, structured findings (`{finding, recommendation, confidence}`) |
| **🧪 Test / Review** | `FileCheck` | Quality audits, WCAG 2.1 accessibility, render performance, regression resistance |
# Multimodal-Agent-Setup
