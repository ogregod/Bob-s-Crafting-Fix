/**
 * Skill Test Implementation
 * Handles DnD 5e skill checks for crafting progression
 */

import { Test, TestCustomized, TestResult, InitiatorData } from './Test.js';

export interface SkillTestData {
    skill: string;  // Skill ID (e.g., "acr", "arc", "ath")
    dc: number;     // Difficulty Class
}

/**
 * Skill Test - rolls a skill check against a DC
 */
export class SkillTest implements Test<SkillTestData> {
    static create(data: SkillTestData): SkillTestCustomized {
        return new SkillTestCustomized(data);
    }

    // For compatibility with the Test interface
    create(data: SkillTestData): TestCustomized {
        return SkillTest.create(data);
    }
}

class SkillTestCustomized implements TestCustomized {
    data: SkillTestData;

    constructor(data: SkillTestData) {
        this.data = {
            skill: data.skill,
            dc: data.dc || 10
        };
    }

    render(): string {
        // @ts-ignore
        const skillLabel = CONFIG.DND5E?.skills?.[this.data.skill]?.label || this.data.skill;
        return `${skillLabel} DC ${this.data.dc}`;
    }

    async action(initiatorData: InitiatorData): Promise<TestResult> {
        const actor = game.actors.get(initiatorData.actorId);
        if (!actor) {
            throw new Error("Actor not found for skill test");
        }

        try {
            // DnD 5e 5.x+ skill roll
            // @ts-ignore
            const roll = await actor.rollSkill(this.data.skill, {
                targetValue: this.data.dc,
                chatMessage: true
            });

            // Check if roll succeeded
            const total = roll.total;
            const success = total >= this.data.dc ? 1 : 0;
            const fail = total < this.data.dc ? 1 : 0;

            return { success, fail };
        } catch (error) {
            console.error("Error executing skill test:", error);
            throw error;
        }
    }
}
