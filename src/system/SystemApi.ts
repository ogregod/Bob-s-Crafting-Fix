/**
 * Main System API Singleton
 * Replaces the global beaversSystemInterface from the original module architecture
 */

import { Dnd5eSystem } from './Dnd5eSystem.js';

export interface Test<T> {
    create(data: T): TestCustomized;
}

export interface TestCustomized {
    action(initiatorData: InitiatorData): Promise<TestResult>;
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
 * Bob's Crafting System - Main API singleton
 */
export class BobsCraftingSystem {
    private static instance: BobsCraftingSystem;
    public dnd5e: Dnd5eSystem;
    public testClasses: Map<string, Test<any>>;

    private constructor() {
        this.dnd5e = new Dnd5eSystem();
        this.testClasses = new Map();
    }

    static getInstance(): BobsCraftingSystem {
        if (!this.instance) {
            this.instance = new BobsCraftingSystem();
        }
        return this.instance;
    }

    /**
     * Register a test class for use in recipes
     * @param name Test class name (e.g., "SkillTest")
     * @param testClass Test class constructor
     */
    registerTest(name: string, testClass: Test<any>): void {
        this.testClasses.set(name, testClass);
    }

    /**
     * Get a registered test class
     * @param name Test class name
     * @returns Test class or undefined
     */
    getTest(name: string): Test<any> | undefined {
        return this.testClasses.get(name);
    }

    /**
     * Check if a test class is registered
     * @param name Test class name
     * @returns True if registered
     */
    hasTest(name: string): boolean {
        return this.testClasses.has(name);
    }

    /**
     * Get all registered test class names
     * @returns Array of test class names
     */
    getTestNames(): string[] {
        return Array.from(this.testClasses.keys());
    }

    /**
     * Initialize the system (called on ready hook)
     */
    async initialize(): Promise<void> {
        console.log("Bob's Crafting System | System API initialized");
    }
}

// Declare global type augmentation
declare global {
    interface Window {
        bobsCraftingSystem: BobsCraftingSystem;
    }
}
