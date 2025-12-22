/**
 * Ability Test Implementation
 * Handles DnD 5e ability checks for crafting progression
 */

import { Test, TestCustomized, TestResult, InitiatorData } from './Test.js';

export interface AbilityTestData {
    ability: string;  // Ability ID (e.g., "str", "dex", "con", "int", "wis", "cha")
    dc: number;       // Difficulty Class
}

/**
 * Ability Test - rolls an ability check against a DC
 */
export class AbilityTest implements Test<AbilityTestData> {
    static create(data: AbilityTestData): AbilityTestCustomized {
        return new AbilityTestCustomized(data);
    }

    // For compatibility with the Test interface
    create(data: AbilityTestData): TestCustomized {
        return AbilityTest.create(data);
    }
}

class AbilityTestCustomized implements TestCustomized {
    data: AbilityTestData;

    constructor(data: AbilityTestData) {
        this.data = {
            ability: data.ability,
            dc: data.dc || 10
        };
    }

    render(): string {
        // @ts-ignore
        const abilityLabel = CONFIG.DND5E?.abilities?.[this.data.ability]?.label || this.data.ability;
        return `${abilityLabel} DC ${this.data.dc}`;
    }

    async action(initiatorData: InitiatorData): Promise<TestResult> {
        const actor = game.actors.get(initiatorData.actorId);
        if (!actor) {
            throw new Error("Actor not found for ability test");
        }

        try {
            // DnD 5e 5.x+ ability roll
            // @ts-ignore
            const roll = await actor.rollAbilityTest(this.data.ability, {
                targetValue: this.data.dc,
                chatMessage: true
            });

            // Check if roll succeeded
            const total = roll.total;
            const success = total >= this.data.dc ? 1 : 0;
            const fail = total < this.data.dc ? 1 : 0;

            return { success, fail };
        } catch (error) {
            console.error("Error executing ability test:", error);
            throw error;
        }
    }
}
