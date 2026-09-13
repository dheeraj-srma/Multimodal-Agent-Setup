"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRuntime = exports.AgentRuntime = void 0;
const OrchestratorAgent_1 = require("../orchestrator/OrchestratorAgent");
const DesignAgent_1 = require("../design/DesignAgent");
const CoderAgent_1 = require("../coder/CoderAgent");
const ResearchAgent_1 = require("../research/ResearchAgent");
const TestAgent_1 = require("../tester/TestAgent");
const EventBus_1 = require("../../events/EventBus");
class AgentRuntime {
    static instance;
    agents = new Map();
    constructor() {
        // Instantiate all 5 swarm agents
        const orchestrator = new OrchestratorAgent_1.OrchestratorAgent();
        const design = new DesignAgent_1.DesignAgent();
        const coder = new CoderAgent_1.CoderAgent();
        const research = new ResearchAgent_1.ResearchAgent();
        const tester = new TestAgent_1.TestAgent();
        this.agents.set('orchestrator', orchestrator);
        this.agents.set('design', design);
        this.agents.set('coder', coder);
        this.agents.set('research', research);
        this.agents.set('tester', tester);
        // Route inter-agent messages through the runtime
        EventBus_1.eventBus.subscribe((event) => {
            if (event.type === 'AGENT_MESSAGE') {
                const msg = event.payload;
                if (msg.to === 'broadcast') {
                    for (const [id, agent] of this.agents.entries()) {
                        if (id !== msg.from) {
                            agent.receiveMessage(msg).catch(console.error);
                        }
                    }
                }
                else {
                    const recipient = this.agents.get(msg.to);
                    if (recipient) {
                        recipient.receiveMessage(msg).catch(console.error);
                    }
                }
            }
        });
    }
    static getInstance() {
        if (!AgentRuntime.instance) {
            AgentRuntime.instance = new AgentRuntime();
        }
        return AgentRuntime.instance;
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    async start(task) {
        const agent = this.agents.get(task.agentId);
        if (!agent) {
            throw new Error(`[AgentRuntime] Unknown agentId: ${task.agentId}`);
        }
        await agent.startTask(task);
    }
    async stop(agentId) {
        if (agentId === 'all') {
            for (const agent of this.agents.values()) {
                await agent.stop();
            }
            return;
        }
        const agent = this.agents.get(agentId);
        if (agent) {
            await agent.stop();
        }
    }
    async pause(agentId) {
        if (agentId === 'all') {
            for (const agent of this.agents.values()) {
                await agent.pause();
            }
            return;
        }
        const agent = this.agents.get(agentId);
        if (agent) {
            await agent.pause();
        }
    }
    async resume(agentId) {
        if (agentId === 'all') {
            for (const agent of this.agents.values()) {
                await agent.resume();
            }
            return;
        }
        const agent = this.agents.get(agentId);
        if (agent) {
            await agent.resume();
        }
    }
    async sendMessage(message) {
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: message.from,
            type: 'AGENT_MESSAGE',
            payload: message,
        });
    }
    getStatus(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return {
                agentId: agentId,
                role: 'Coder Agent',
                state: 'IDLE',
                progress: 0,
                filesTouchedCount: 0,
                messagesCount: 0,
                executionDurationMs: 0,
            };
        }
        return agent.getStatus();
    }
    getAllStatuses() {
        const map = {};
        for (const [id, agent] of this.agents.entries()) {
            map[id] = agent.getStatus();
        }
        return map;
    }
    subscribe(listener) {
        return EventBus_1.eventBus.subscribe(listener);
    }
}
exports.AgentRuntime = AgentRuntime;
exports.agentRuntime = AgentRuntime.getInstance();
