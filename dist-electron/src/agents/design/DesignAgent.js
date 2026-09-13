"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
const LocalIntelligenceEngine_1 = require("../../ai/LocalIntelligenceEngine");
const WorkspaceSafety_1 = require("../../workspace/WorkspaceSafety");
class DesignAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        super('design', 'Design Agent');
    }
    async execute(task) {
        this.emitLog('info', `Initiating UI/UX visual hierarchy inspection for: ${task.title}`);
        this.emitProgress(20, 'Analyzing existing UI components and style tokens');
        await this.checkPause();
        await new Promise((r) => setTimeout(r, 700));
        this.emitProgress(50, 'Formulating color palette, typography scales, and HUD aesthetic');
        const spec = await LocalIntelligenceEngine_1.localIntelligenceEngine.executeDesign(task.description);
        this.emitLog('info', `Selected primary aesthetic: ${spec.visualHierarchy}`);
        await this.checkPause();
        await new Promise((r) => setTimeout(r, 600));
        this.emitProgress(75, 'Validating CSS tokens against safe shared workspace');
        // Register change in workspace safety to ensure safe modification
        const safetyCheck = WorkspaceSafety_1.workspaceSafety.registerModification('src/styles/theme.css', this.agentId, 1, 60, `/* Design Agent tokens */\n:root { --primary: ${spec.colorPalette.primary}; --accent: ${spec.colorPalette.accent}; }`);
        if (safetyCheck.safe) {
            this.recordFileChange({
                filePath: 'src/styles/theme.css',
                changeType: 'modified',
                linesAdded: 35,
                linesRemoved: 4,
                summary: 'Updated CSS custom properties with NASA Mission Control color palette tokens',
                diffSnippet: `+ :root {\n+   --color-cyan: ${spec.colorPalette.primary};\n+   --color-emerald: ${spec.colorPalette.accent};\n+ }`,
            });
        }
        this.emitProgress(90, 'Dispatching design specification to Orchestrator and Coder');
        this.sendMessage('orchestrator', 'DESIGN_SPEC_READY', spec);
        this.sendMessage('coder', 'DESIGN_SPEC_FORWARDED', {
            palette: spec.colorPalette,
            tokens: spec.typographyTokens,
            files: spec.affectedFiles,
        });
        this.emitProgress(100, 'Design specification finalized');
        return spec;
    }
}
exports.DesignAgent = DesignAgent;
