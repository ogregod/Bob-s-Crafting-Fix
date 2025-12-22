/**
 * Tool Test Implementation
 * Handles DnD 5e tool proficiency checks for crafting progression
 */

import { Test, TestCustomized, TestResult, InitiatorData } from './Test.js';

export interface ToolTestData {
    uuid: string;   // Tool item UUID
    dc: number;     // Difficulty Class
}

/**
 * Tool Test - rolls a tool check against a DC
 */
export class ToolTest implements Test<ToolTestData> {
    static create(data: ToolTestData): ToolTestCustomized {
        return new ToolTestCustomized(data);
    }

    // For compatibility with the Test interface
    create(data: ToolTestData): TestCustomized {
        return ToolTest.create(data);
    }
}

class ToolTestCustomized implements TestCustomized {
    data: ToolTestData;
    private toolItem: any = null;

    constructor(data: ToolTestData) {
        this.data = {
            uuid: data.uuid,
            dc: data.dc || 10
        };
    }

    render(): string {
        if (this.toolItem) {
            return `${this.toolItem.name} DC ${this.data.dc}`;
        }
        return `Tool Check DC ${this.data.dc}`;
    }

    async action(initiatorData: InitiatorData): Promise<TestResult> {
        const actor = game.actors.get(initiatorData.actorId);
        if (!actor) {
            throw new Error("Actor not found for tool test");
        }

        try {
            // Find the tool in actor's inventory
            const tool = actor.items.find((item: any) => item.uuid === this.data.uuid);
            if (!tool) {
                // Try to resolve UUID globally
                const globalTool = await fromUuid(this.data.uuid);
                if (!globalTool) {
                    throw new Error(`Tool not found: ${this.data.uuid}`);
                }
                // Check if actor has this tool by name
                const actorTool = actor.items.find((item: any) => item.name === globalTool.name && item.type === "tool");
                if (!actorTool) {
                    throw new Error(`Actor does not have tool: ${globalTool.name}`);
                }
                this.toolItem = actorTool;
            } else {
                this.toolItem = tool;
            }

            // DnD 5e tool check
            // @ts-ignore
            const roll = await this.toolItem.rollToolCheck({
                targetValue: this.data.dc,
                chatMessage: true
            });

            // Check if roll succeeded
            const total = roll.total;
            const success = total >= this.data.dc ? 1 : 0;
            const fail = total < this.data.dc ? 1 : 0;

            return { success, fail };
        } catch (error) {
            console.error("Error executing tool test:", error);
            throw error;
        }
    }
}
