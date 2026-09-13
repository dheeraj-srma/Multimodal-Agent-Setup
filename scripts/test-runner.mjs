/**
 * Automated Verification Test Suite for Agent Command Center
 * Tests EventBus, WorkspaceSafety, DAGScheduler, ParallelismTracker, and Swarm Execution
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { eventBus } = require('../dist-electron/src/events/EventBus.js');
const { workspaceSafety } = require('../dist-electron/src/workspace/WorkspaceSafety.js');
const { parallelismTracker } = require('../dist-electron/src/orchestration/ParallelismTracker.js');
const { storageManager } = require('../dist-electron/src/storage/StorageManager.js');
const { orchestratorAgent } = require('../dist-electron/src/agents/orchestrator/OrchestratorAgent.js');
const { dagScheduler } = require('../dist-electron/src/orchestration/DAGScheduler.js');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING AGENT COMMAND CENTER VERIFICATION SUITE');
  console.log('====================================================\n');

  // Test 1: EventBus
  console.log('[1/5] Testing Central EventBus...');
  let eventReceived = false;
  const unsub = eventBus.subscribe((ev) => {
    if (ev.type === 'AGENT_LOG' && ev.payload.message === 'test-event') {
      eventReceived = true;
    }
  });
  eventBus.publish({
    id: 'test-1',
    timestamp: Date.now(),
    agentId: 'orchestrator',
    type: 'AGENT_LOG',
    payload: { level: 'info', message: 'test-event' },
  });
  assert(eventReceived === true, 'EventBus delivers events to subscribers');
  unsub();

  // Test 2: WorkspaceSafety & Conflict Detection
  console.log('\n[2/5] Testing WorkspaceSafety & Collision Detection...');
  workspaceSafety.clearHistory();
  const modA = workspaceSafety.registerModification('src/App.tsx', 'design', 20, 50, 'const UI = 1;');
  assert(modA.safe === true, 'First modification by Design agent is safe');

  // Concurrent overlapping modification by Coder agent on lines 30-70 (overlaps with 20-50!)
  const modB = workspaceSafety.registerModification('src/App.tsx', 'coder', 30, 70, 'const UI = 2;');
  assert(modB.safe === false, 'Detects collision when Coder overlaps with Design agent');
  assert(modB.conflict !== undefined, 'Generates structured FileConflictPayload');

  if (modB.conflict) {
    const resolved = workspaceSafety.resolveConflict(modB.conflict.conflictId, 'KEEP_B');
    assert(resolved?.status === 'RESOLVED', 'Resolves conflict successfully with KEEP_B');
  }

  // Test 3: ParallelismTracker
  console.log('\n[3/5] Testing ParallelismTracker calculation...');
  parallelismTracker.reset();
  const t0 = 1000;
  parallelismTracker.startMission(t0);
  // Simulate 3 agents running concurrently for 1000ms each over a 1000ms mission wall-clock window
  parallelismTracker.recordAgentStart('research', t0);
  parallelismTracker.recordAgentStart('design', t0);
  parallelismTracker.recordAgentStart('tester', t0);
  parallelismTracker.recordAgentEnd('research', t0 + 1000);
  parallelismTracker.recordAgentEnd('design', t0 + 1000);
  parallelismTracker.recordAgentEnd('tester', t0 + 1000);
  const pFactor = parallelismTracker.getParallelismFactor();
  assert(pFactor >= 1.0, `Calculates real-time parallelism factor (got ${pFactor}x)`);

  // Test 4: Dynamic DAG Decomposition
  console.log('\n[4/5] Testing Dynamic DAG Task Decomposition...');
  const mission = orchestratorAgent.prepareMission(
    'Audit this project and identify improvements to UI, architecture, performance and accessibility.'
  );
  assert(mission.tasks.length === 5, 'Orchestrator generates 5 specialized DAG tasks');
  const indeps = mission.tasks.filter((t) => t.dependsOn.length === 0);
  const deps = mission.tasks.filter((t) => t.dependsOn.length > 0);
  assert(indeps.length >= 3, 'Identifies at least 3 independent concurrent tasks (Research, Design, Audit)');
  assert(deps.length >= 2, 'Identifies dependent integration tasks (Implementation, Final Review)');

  // Test 5: Swarm Concurrent Execution
  console.log('\n[5/5] Testing End-to-End Swarm Execution...');
  await dagScheduler.runMission(mission);

  // Poll until mission finishes or timeout (max 15s)
  let waited = 0;
  while (waited < 15000) {
    await new Promise((r) => setTimeout(r, 500));
    waited += 500;
    const m = storageManager.getMission(mission.id);
    if (m && (m.status === 'COMPLETED' || m.status === 'FAILED')) {
      break;
    }
  }

  const finalMission = storageManager.getMission(mission.id);
  assert(finalMission !== undefined, 'Mission persisted to storage');
  console.log(`  Swarm mission status: ${finalMission?.status}`);
  console.log(`  Tasks completed: ${finalMission?.completedTasksCount} / ${finalMission?.tasks.length}`);
  console.log(`  Parallelism factor achieved: ${finalMission?.parallelismFactor}x`);
  assert(finalMission?.completedTasksCount === 5, 'All 5 tasks completed successfully');
  assert(finalMission?.finalReport !== undefined, 'Final synthesized markdown report generated');

  console.log('\n====================================================');
  console.log(`SUMMARY: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('====================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
