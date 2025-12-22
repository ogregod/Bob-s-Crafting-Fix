/**
 * Test System Interfaces
 * Base interfaces for the test/check system used in crafting
 */

export interface Test<T> {
    /**
     * Create a test instance from data
     * @param data Test configuration data
     * @returns Customized test instance
     */
    create(data: T): TestCustomized;
}

export interface TestCustomized {
    /**
     * Execute the test
     * @param initiatorData Information about who/where is executing the test
     * @returns Test result with success/fail counts
     */
    action(initiatorData: InitiatorData): Promise<TestResult>;

    /**
     * Render a string representation of this test
     * @returns Display string (e.g., "Arcana DC 15")
     */
    render(): string;
}

export interface TestResult {
    success: number;
    fail: number;
}

export interface InitiatorData {
    userId: string;
    actorId: string;
    sceneId: string;
}

/**
 * Serialized test data stored in recipes
 */
export interface SerializedTest<T> {
    type: string;  // Test class name
    data: T;       // Test-specific configuration
}
