/**
 * Component class - represents items, currencies, and other game elements
 * Replaces the ComponentData interface from beavers-system-interface
 */

import { Settings } from '../Settings.js';

export interface ComponentData {
    type: string;
    name: string;
    img: string;
    uuid?: string;
    quantity?: number;
    flags?: any;
    userInteraction?: "always" | "never" | "onSuccess";
    consume?: boolean; // Whether this component should be consumed (default: true)
    totalUses?: number; // Total uses per item (e.g., a bag of salt has 64 uses)
    usesNeeded?: number; // Uses consumed by this recipe (e.g., recipe needs 4 uses)
}

/**
 * Component class with DnD 5e-specific logic
 */
export class Component implements ComponentData {
    type: string;
    name: string;
    img: string;
    uuid: string;
    quantity: number;
    flags: any;
    userInteraction?: "always" | "never" | "onSuccess";
    consume?: boolean;
    totalUses?: number;
    usesNeeded?: number;

    constructor(data: ComponentData) {
        this.type = data.type || "Item";
        this.name = data.name;
        this.img = data.img || "icons/svg/item-bag.svg";
        this.uuid = data.uuid || "";
        this.quantity = data.quantity || 1;
        this.flags = data.flags || {};
        this.userInteraction = data.userInteraction;
        this.consume = data.consume !== undefined ? data.consume : true; // Default to true for backward compatibility
        this.totalUses = data.totalUses; // Total uses per item (optional)
        this.usesNeeded = data.usesNeeded; // Uses needed for recipe (optional)
    }

    /**
     * Compare this component with another to see if they represent the same entity
     * Handles the crafted items separation logic based on settings
     * @param other The other component to compare with
     * @returns True if components are the same
     */
    isSame(other: ComponentData): boolean {
        // Get crafted flags
        const aHasFlag = foundry.utils.getProperty(this, `flags.bobs-crafting-guide.isCrafted`);
        const bHasFlag = foundry.utils.getProperty(other, `flags.bobs-crafting-guide.isCrafted`);

        // Get separation setting
        const separateSetting = Settings.get(Settings.SEPARATE_CRAFTED_ITEMS);

        // Base comparison - same UUID or same name+type
        let isSame = false;
        if (this.uuid && other.uuid) {
            isSame = this.uuid === other.uuid;
        } else {
            // Fallback to name+type comparison if no UUID
            isSame = this.name === other.name && this.type === other.type;
        }

        // Apply crafted items separation logic
        if (separateSetting === "full") {
            // Fully separate crafted from non-crafted
            isSame = isSame && aHasFlag === bHasFlag;
        } else if (separateSetting === "partial") {
            // Only separate if this component is crafted
            isSame = isSame && (!aHasFlag || aHasFlag === bHasFlag);
        }
        // "none" - no separation, use base comparison

        return isSame;
    }

    /**
     * Get the Foundry document this component references
     * @returns The Foundry document or null
     */
    async getEntity(): Promise<any> {
        if (!this.uuid) return null;
        return await fromUuid(this.uuid);
    }

    /**
     * Create a Component from a Foundry Item entity
     * @param item The Foundry Item
     * @returns Component instance
     */
    static fromEntity(item: any): Component {
        // DnD 5e specific item extraction
        return new Component({
            type: item.type,
            name: item.name,
            img: item.img,
            uuid: item.uuid,
            quantity: item.system?.quantity || 1,
            flags: item.flags || {}
        });
    }

    /**
     * Create a component from raw data
     * @param data Component data
     * @returns Component instance
     */
    static create(data: ComponentData): Component {
        return new Component(data);
    }

    /**
     * Serialize this component to a plain object
     * @returns Plain object representation
     */
    serialize(): ComponentData {
        return {
            type: this.type,
            name: this.name,
            img: this.img,
            uuid: this.uuid,
            quantity: this.quantity,
            flags: this.flags,
            userInteraction: this.userInteraction,
            consume: this.consume,
            totalUses: this.totalUses,
            usesNeeded: this.usesNeeded
        };
    }
}
