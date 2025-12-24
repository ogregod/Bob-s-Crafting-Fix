/**
 * Tool Test Implementation
 * Handles DnD 5e tool proficiency checks for crafting progression
 */

import { Test, TestCustomized, TestResult, InitiatorData } from './Test.js';

export interface ToolTestData {
    uuid?: string;      // Tool item UUID (new format)
    tool?: string;      // Tool name (old format - for backwards compatibility)
    ability?: string;   // Ability score (old format)
    checkType?: string; // 'ability' or 'skill'
    skill?: string;     // Skill name if checkType is 'skill'
    dc: number;         // Difficulty Class
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
    private toolName: string = "Tool";

    constructor(data: ToolTestData) {
        this.data = {
            uuid: data.uuid,
            tool: data.tool,
            ability: data.ability,
            checkType: data.checkType,
            skill: data.skill,
            dc: data.dc || 10
        };

        // Store tool name for display
        if (data.tool) {
            this.toolName = data.tool;
        }
    }

    render(): string {
        if (this.toolItem) {
            return `${this.toolItem.name} DC ${this.data.dc}`;
        }
        if (this.toolName && this.toolName !== "Tool") {
            return `${this.toolName} DC ${this.data.dc}`;
        }
        return `Tool Check DC ${this.data.dc}`;
    }

    async action(initiatorData: InitiatorData): Promise<TestResult> {
        const actor = (game as any).actors?.get(initiatorData.actorId);
        if (!actor) {
            throw new Error("Actor not found for tool test");
        }

        try {
            // Try to find tool by UUID first (new format)
            if (this.data.uuid) {
                const tool = actor.items.find((item: any) => item.uuid === this.data.uuid);
                if (!tool) {
                    // Try to resolve UUID globally
                    const globalTool = await fromUuid(this.data.uuid);
                    if (globalTool) {
                        // Check if actor has this tool by name
                        const actorTool = actor.items.find((item: any) => item.name === globalTool.name && item.type === "tool");
                        if (actorTool) {
                            this.toolItem = actorTool;
                        }
                    }
                } else {
                    this.toolItem = tool;
                }
            }

            // Fall back to finding by name (old format)
            if (!this.toolItem && this.data.tool) {
                this.toolItem = actor.items.find((item: any) =>
                    item.name === this.data.tool && item.type === "tool"
                );
            }

            // If still no tool found, throw error
            if (!this.toolItem) {
                const toolIdentifier = this.data.tool || this.data.uuid || "unknown";
                throw new Error(`Actor does not have required tool: ${toolIdentifier}`);
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
