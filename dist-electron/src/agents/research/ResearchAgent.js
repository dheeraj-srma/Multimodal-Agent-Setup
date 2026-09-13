"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
const LocalIntelligenceEngine_1 = require("../../ai/LocalIntelligenceEngine");
class ResearchAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        super('research', 'Research Agent');
    }
    async execute(task) {
        this.emitLog('info', `Starting research investigation on: ${task.title}`);
        this.emitProgress(15, 'Scanning project architecture and dependencies');
        await this.checkPause();
        await new Promise((r) => setTimeout(r, 600));
        this.emitProgress(40, 'Benchmarking design system tokens & accessibility constraints');
        this.emitLog('info', 'Querying best practices for real-time SVG telemetry & contrast ratios');
        await this.checkPause();
        await new Promise((r) => setTimeout(r, 700));
        this.emitProgress(75, 'Synthesizing actionable recommendations & structured findings');
        const findings = await LocalIntelligenceEngine_1.localIntelligenceEngine.executeResearch(task.description);
        await this.checkPause();
        for (const f of findings) {
            this.emitLog('success', `Finding [${f.confidence}]: ${f.finding.slice(0, 70)}...`);
        }
        this.emitProgress(90, 'Transmitting research payload to Orchestrator');
        this.sendMessage('orchestrator', 'RESEARCH_FINDINGS_COMPLETED', {
            taskId: task.id,
            findings,
        });
        this.emitProgress(100, 'Research phase complete');
        return findings;
    }
}
exports.ResearchAgent = ResearchAgent;
