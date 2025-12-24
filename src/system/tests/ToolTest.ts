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
    private resolvedToolName: Promise<string>;

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

        // Try to resolve tool name from UUID
        this.resolvedToolName = this.resolveToolName();
    }

    private async resolveToolName(): Promise<string> {
        if (this.data.uuid) {
            try {
                const tool = await fromUuid(this.data.uuid);
                if (tool) {
                    return (tool as any).name;
                }
            } catch (e) {
                console.warn("Could not resolve tool UUID:", this.data.uuid);
            }
        }
        return this.data.tool || "Tool";
    }

    render(): string {
        // Use the stored tool name (will be updated by resolveToolName)
        const displayName = this.toolName && this.toolName !== "Tool" ? this.toolName : "Tool Check";
        return `${displayName} DC ${this.data.dc}`;
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

            // Update the tool name for display
            this.toolName = this.toolItem.name;

            // Prepare roll options
            const rollOptions: any = {
                targetValue: this.data.dc
            };

            // Add ability or skill based on checkType
            if (this.data.checkType === 'skill' && this.data.skill) {
                rollOptions.skill = this.data.skill;
            } else if (this.data.ability) {
                rollOptions.ability = this.data.ability;
            }

            console.log("Rolling tool check with options:", rollOptions);

            // DnD 5e tool check
            // @ts-ignore
            const result = await this.toolItem.rollToolCheck(rollOptions);

            console.log("Tool check result:", result);

            // Handle different return formats (DnD5e v2 vs v3+)
            let roll;
            let total;

            if (result?.rolls && result.rolls.length > 0) {
                // DnD5e v3+ returns {rolls: [roll]}
                roll = result.rolls[0];
                total = roll.total;
            } else if (result?.roll) {
                // Some versions return {roll: Roll}
                roll = result.roll;
                total = roll.total;
            } else if (result?.total !== undefined) {
                // DnD5e v2 returns roll directly
                roll = result;
                total = result.total;
            } else {
                console.error("Unexpected roll result format:", result);
                console.error("Available properties:", Object.keys(result || {}));

                // Try to find the roll in the chat message that was just posted
                const messages = (game as any).messages?.contents;
                if (messages && messages.length > 0) {
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage.rolls && lastMessage.rolls.length > 0) {
                        roll = lastMessage.rolls[0];
                        total = roll.total;
                        console.log("Retrieved roll from chat message:", total);
                    }
                }

                if (!roll || total === undefined) {
                    throw new Error("Failed to get roll result from tool check");
                }
            }

            // Check if roll succeeded
            const success = total >= this.data.dc ? 1 : 0;
            const fail = total < this.data.dc ? 1 : 0;

            console.log(`Tool check: rolled ${total} vs DC ${this.data.dc} = ${success ? 'SUCCESS' : 'FAIL'}`);

            return { success, fail };
        } catch (error) {
            console.error("Error executing tool test:", error);
            throw error;
        }
    }
}
