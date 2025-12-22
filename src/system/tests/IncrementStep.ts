/**
 * Increment Step Test Implementation
 * Auto-success test for simple progression (no roll required)
 */

import { Test, TestCustomized, TestResult, InitiatorData } from './Test.js';

export interface IncrementStepData {
    value?: number;  // Number of automatic successes (default: 1)
}

/**
 * Increment Step - automatic success without rolling
 * Used for time-based or simple progression
 */
export class IncrementStep implements Test<IncrementStepData> {
    static create(data: IncrementStepData): IncrementStepCustomized {
        return new IncrementStepCustomized(data);
    }

    // For compatibility with the Test interface
    create(data: IncrementStepData): TestCustomized {
        return IncrementStep.create(data);
    }
}

class IncrementStepCustomized implements TestCustomized {
    data: IncrementStepData;

    constructor(data: IncrementStepData) {
        this.data = {
            value: data.value || 1
        };
    }

    render(): string {
        if (this.data.value === 1) {
            return "Progress";
        }
        return `Progress +${this.data.value}`;
    }

    async action(initiatorData: InitiatorData): Promise<TestResult> {
        // Automatic success
        return {
            success: this.data.value || 1,
            fail: 0
        };
    }
}
