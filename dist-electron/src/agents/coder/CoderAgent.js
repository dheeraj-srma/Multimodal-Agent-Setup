"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoderAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
const WorkspaceSafety_1 = require("../../workspace/WorkspaceSafety");
class CoderAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        super('coder', 'Coder Agent');
    }
    async execute(task) {
        this.emitLog('info', `Coder starting execution: ${task.title}`);
        this.emitProgress(15, 'Inspecting workspace files & dependencies');
        await this.checkPause();
        await new Promise((r) => setTimeout(r, 600));
        // Step 1: Inspect recent modifications from other agents
        this.emitProgress(30, 'Reviewing recent modifications by Design and Research agents');
        const recentModifications = WorkspaceSafety_1.workspaceSafety.getModificationHistory();
        this.emitLog('info', `Found ${recentModifications.length} prior workspace modifications to respect`);
        await this.checkPause();
        await new Promise((r) => setTimeout(r, 600));
        // Step 2: Implement smallest appropriate change for components
        this.emitProgress(55, 'Writing clean modular component architecture');
        const targetFile = 'src/components/AgentGraph/AgentGraph.tsx';
        // Register modification safely
        const safetyCheck = WorkspaceSafety_1.workspaceSafety.registerModification(targetFile, this.agentId, 1, 180, '// Coder Agent: Optimized SVG render loop and event packet dispatcher');
        if (safetyCheck.safe) {
            const fileChange = {
                filePath: targetFile,
                changeType: 'modified',
                linesAdded: 84,
                linesRemoved: 12,
                summary: 'Integrated dynamic SVG packet animations with sub-millisecond dispatch timestamps',
                diffSnippet: `+ export const AgentGraph: React.FC<AgentGraphProps> = ({ nodes, packets }) => {\n+   // Real-time animated data packets\n+   return <svg className="agent-graph-svg">...`,
            };
            this.recordFileChange(fileChange);
            this.emitLog('success', `Safely updated ${targetFile} with minimal delta (+84, -12)`);
        }
        else {
            this.emitLog('warn', `Conflict detected on ${targetFile}. Pausing for resolution.`);
        }
        await this.checkPause();
        await new Promise((r) => setTimeout(r, 800));
        // Step 3: Second file implementation (e.g. ActivityTerminal or Telemetry)
        this.emitProgress(80, 'Refactoring ActivityTerminal filter pipeline');
        const termFile = 'src/components/ActivityTerminal/ActivityTerminal.tsx';
        const safetyTerm = WorkspaceSafety_1.workspaceSafety.registerModification(termFile, this.agentId, 1, 120, '// Coder Agent: Filter pipeline optimizations');
        if (safetyTerm.safe) {
            this.recordFileChange({
                filePath: termFile,
                changeType: 'modified',
                linesAdded: 45,
                linesRemoved: 6,
                summary: 'Added agent filter tabs and monospace event syntax coloring',
                diffSnippet: `+ const filteredEvents = useMemo(() => eventBus.getHistory(filter), [filter]);`,
            });
            this.emitLog('success', `Updated ${termFile} (+45, -6)`);
        }
        this.emitProgress(95, 'Notifying Test / Review agent that implementation is ready for audit');
        this.sendMessage('tester', 'IMPLEMENTATION_READY_FOR_REVIEW', {
            taskId: task.id,
            modifiedFiles: [targetFile, termFile],
        });
        this.sendMessage('orchestrator', 'CODER_IMPLEMENTATION_COMPLETED', {
            taskId: task.id,
            filesCount: 2,
        });
        this.emitProgress(100, 'Implementation completed cleanly');
        return { filesModified: [targetFile, termFile], changesCount: 2 };
    }
}
exports.CoderAgent = CoderAgent;
