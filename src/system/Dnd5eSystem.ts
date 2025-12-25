/**
 * DnD 5e System Implementation
 * Provides all DnD 5e-specific functionality
 * Replaces bsa-dnd5e module
 */

import { Component, ComponentData } from './Component.js';

export interface SkillConfig {
    id: string;
    label: string;
    ability: string;
}

export interface AbilityConfig {
    id: string;
    label: string;
}

export interface CurrencyConfig {
    id: string;
    label: string;
    abbreviation: string;
    conversion: number;
    component?: Component;
}

export interface ItemChange {
    create: any[];
    update: any[];
    delete: any[];
}

/**
 * DnD 5e system implementation
 */
export class Dnd5eSystem {
    private dnd5eVersion: string;
    public configLootItemType: string = "loot";
    public configCanRollAbility: boolean = true;

    constructor() {
        this.dnd5eVersion = (game as any).system?.version || "5.0.0";
    }

    get majorVersion(): number {
        return parseInt(this.dnd5eVersion.split('.')[0]);
    }

    get minorVersion(): number {
        return parseInt(this.dnd5eVersion.split('.')[1]);
    }

    get patchVersion(): number {
        return parseInt(this.dnd5eVersion.split('.')[2] || "0");
    }

    /**
     * Get DnD 5e skills configuration
     */
    get configSkills(): SkillConfig[] {
        const skills: SkillConfig[] = [];
        // @ts-ignore
        const dnd5eSkills = CONFIG.DND5E?.skills || {};

        for (const [id, skill] of Object.entries(dnd5eSkills)) {
            skills.push({
                id: id,
                // @ts-ignore
                label: skill.label || id,
                // @ts-ignore
                ability: skill.ability || ""
            });
        }

        return skills;
    }

    /**
     * Get DnD 5e abilities configuration
     */
    get configAbilities(): AbilityConfig[] {
        const abilities: AbilityConfig[] = [];
        // @ts-ignore
        const dnd5eAbilities = CONFIG.DND5E?.abilities || {};

        for (const [id, ability] of Object.entries(dnd5eAbilities)) {
            abilities.push({
                id: id,
                // @ts-ignore
                label: ability.label || id
            });
        }

        return abilities;
    }

    /**
     * Get DnD 5e currencies configuration
     * Sorted from highest to lowest value
     */
    get configCurrencies(): CurrencyConfig[] {
        return [
            {
                id: "pp",
                label: "DND5E.CurrencyPP",
                abbreviation: "DND5E.CurrencyAbbrPP",
                conversion: 10,
                component: undefined
            },
            {
                id: "gp",
                label: "DND5E.CurrencyGP",
                abbreviation: "DND5E.CurrencyAbbrGP",
                conversion: 1,
                component: undefined
            },
            {
                id: "ep",
                label: "DND5E.CurrencyEP",
                abbreviation: "DND5E.CurrencyAbbrEP",
                conversion: 0.5,
                component: undefined
            },
            {
                id: "sp",
                label: "DND5E.CurrencySP",
                abbreviation: "DND5E.CurrencyAbbrSP",
                conversion: 0.1,
                component: undefined
            },
            {
                id: "cp",
                label: "DND5E.CurrencyCP",
                abbreviation: "DND5E.CurrencyAbbrCP",
                conversion: 0.01,
                component: undefined
            }
        ];
    }

    /**
     * Roll a skill check for an actor
     * @param actor The actor rolling
     * @param skillId The skill ID
     * @param options Roll options
     * @returns The roll result
     */
    async actorRollSkill(actor: Actor, skillId: string, options: any = {}): Promise<any> {
        try {
            // DnD 5e 5.x+ API
            // @ts-ignore
            return await actor.rollSkill(skillId, options);
        } catch (e) {
            console.error("Error rolling skill:", e);
            throw e;
        }
    }

    /**
     * Roll an ability check for an actor
     * @param actor The actor rolling
     * @param abilityId The ability ID
     * @param options Roll options
     * @returns The roll result
     */
    async actorRollAbility(actor: Actor, abilityId: string, options: any = {}): Promise<any> {
        try {
            // DnD 5e 5.x+ API
            // @ts-ignore
            return await actor.rollAbilityTest(abilityId, options);
        } catch (e) {
            console.error("Error rolling ability:", e);
            throw e;
        }
    }

    /**
     * Roll a tool check for an actor
     * @param actor The actor rolling
     * @param item The tool item
     * @param options Roll options
     * @returns The roll result
     */
    async actorRollTool(actor: Actor, item: any, options: any = {}): Promise<any> {
        try {
            // DnD 5e tool check
            // @ts-ignore
            return await item.rollToolCheck(options);
        } catch (e) {
            console.error("Error rolling tool:", e);
            throw e;
        }
    }

    /**
     * Add or remove components from an actor's inventory
     * @param actor The actor
     * @param components List of components (negative quantity = remove)
     * @returns Changes made (for rollback)
     */
    async actorComponentListAdd(actor: Actor, components: Component[]): Promise<ItemChange> {
        console.log("[Dnd5eSystem] actorComponentListAdd called with components:", components.map(c => ({
            name: c.name,
            quantity: c.quantity,
            consume: c.consume,
            totalUses: c.totalUses,
            usesNeeded: c.usesNeeded
        })));

        const toCreate: any[] = [];
        const toUpdate: any[] = [];
        const toDelete: string[] = [];

        for (const component of components) {
            if (component.type === "Currency") {
                // Currency handled separately
                continue;
            }

            if (component.type === "RollTable") {
                // Roll tables need special handling
                const table = await fromUuid(component.uuid);
                if (table && table instanceof RollTable) {
                    // @ts-ignore
                    const results = await table.drawMany(component.quantity, {displayChat: false});
                    for (const result of results.results) {
                        if (result.type === 0) { // Text result
                            continue;
                        }
                        // Get the item from the result
                        const resultDoc = await fromUuid(result.documentCollection + "." + result.documentId);
                        if (resultDoc) {
                            const itemComponent = Component.fromEntity(resultDoc);
                            itemComponent.quantity = 1;
                            components.push(itemComponent);
                        }
                    }
                }
                continue;
            }

            if (component.quantity > 0) {
                // Adding items
                const existing = this.findMatchingItem(actor, component);
                if (existing) {
                    toUpdate.push({
                        _id: existing.id,
                        "system.quantity": existing.system.quantity + component.quantity
                    });
                } else {
                    const itemData = await this.componentToItemData(component);
                    toCreate.push(itemData);
                }
            } else if (component.quantity < 0) {
                // Removing items
                const existing = this.findMatchingItem(actor, component);
                if (existing) {
                    // Check if this component uses the "uses" system
                    if (component.totalUses && component.totalUses > 0 && component.usesNeeded && component.usesNeeded > 0) {
                        // Handle uses-based consumption
                        const NAMESPACE = 'bobs-crafting-guide';
                        const totalUses = component.totalUses; // Total uses per item (e.g., 64 for a bag of salt)
                        const usesToConsume = component.usesNeeded; // How many uses this recipe needs (e.g., 4)

                        // Get current remaining uses (or initialize to total if not set)
                        let remainingUses = foundry.utils.getProperty(existing, `flags.${NAMESPACE}.remainingUses`);
                        if (remainingUses === undefined || remainingUses === null) {
                            remainingUses = totalUses;
                        }

                        console.log(`[Dnd5eSystem] Consuming ${usesToConsume} uses from ${component.name} (${remainingUses}/${totalUses} remaining)`);

                        // Calculate new remaining uses
                        let newRemainingUses = remainingUses - usesToConsume;
                        let quantityToRemove = 0;

                        // If we've consumed all uses from current item(s), remove quantities
                        while (newRemainingUses < 0 && existing.system.quantity > quantityToRemove) {
                            quantityToRemove++;
                            newRemainingUses += totalUses;
                        }

                        if (newRemainingUses < 0) {
                            throw new Error(`Not enough uses of ${component.name}. Need ${usesToConsume} uses, but only ${remainingUses + (existing.system.quantity - 1) * totalUses} available.`);
                        }

                        const newQuantity = existing.system.quantity - quantityToRemove;

                        if (newQuantity <= 0) {
                            toDelete.push(existing.id);
                        } else {
                            const updateData: any = {
                                _id: existing.id,
                                "system.quantity": newQuantity
                            };
                            updateData[`flags.${NAMESPACE}.remainingUses`] = newRemainingUses;
                            updateData[`flags.${NAMESPACE}.totalUses`] = totalUses;
                            toUpdate.push(updateData);
                        }

                        console.log(`[Dnd5eSystem] Result: quantity=${newQuantity}, remainingUses=${newRemainingUses}`);
                    } else {
                        // Standard quantity-based consumption
                        const newQuantity = existing.system.quantity + component.quantity; // component.quantity is negative
                        if (newQuantity <= 0) {
                            toDelete.push(existing.id);
                        } else {
                            toUpdate.push({
                                _id: existing.id,
                                "system.quantity": newQuantity
                            });
                        }
                    }
                } else {
                    throw new Error(`Cannot remove ${component.name}: not found in inventory`);
                }
            }
        }

        // Execute operations
        if (toCreate.length > 0) {
            await actor.createEmbeddedDocuments("Item", toCreate);
        }
        if (toUpdate.length > 0) {
            await actor.updateEmbeddedDocuments("Item", toUpdate);
        }
        if (toDelete.length > 0) {
            await actor.deleteEmbeddedDocuments("Item", toDelete);
        }

        return {
            create: toCreate,
            update: toUpdate,
            delete: toDelete.map(id => ({_id: id}))
        };
    }

    /**
     * Find matching items in actor's inventory
     * @param items Actor's item collection
     * @param component Component to find
     * @returns Quantity and matching items
     */
    itemListComponentFind(items: any, component: ComponentData): {quantity: number, items: any[]} {
        let quantity = 0;
        const matchingItems: any[] = [];

        for (const item of items) {
            if (this.isSameItem(item, component)) {
                quantity += item.system?.quantity || 1;
                matchingItems.push(item);
            }
        }

        return { quantity, items: matchingItems };
    }

    /**
     * Check if an item matches a component
     * @param item The Foundry item
     * @param component The component to match
     * @returns True if they match
     */
    private isSameItem(item: any, component: ComponentData): boolean {
        // If UUIDs match, they're the same item
        if (component.uuid && item.uuid && component.uuid === item.uuid) {
            return true;
        }

        // Name must always match
        if (item.name !== component.name) {
            return false;
        }

        // If component has generic "Item" type (from old recipes), ignore type matching
        // Otherwise, types must match
        if (component.type === "Item") {
            return true; // Match by name only for generic "Item" components
        }

        return item.type === component.type;
    }

    /**
     * Find a matching item in actor's inventory
     * @param actor The actor
     * @param component The component to find
     * @returns The matching item or undefined
     */
    private findMatchingItem(actor: Actor, component: ComponentData): any {
        return actor.items.find(item => this.isSameItem(item, component));
    }

    /**
     * Convert a component to Foundry item data
     * @param component The component
     * @returns Item data ready for creation
     */
    private async componentToItemData(component: Component): Promise<any> {
        // If we have a UUID, fetch the source item
        if (component.uuid) {
            const sourceItem = await fromUuid(component.uuid);
            if (sourceItem) {
                const itemData = sourceItem.toObject();
                itemData.system.quantity = component.quantity;
                // Apply flags
                if (component.flags) {
                    itemData.flags = foundry.utils.mergeObject(itemData.flags || {}, component.flags);
                }
                return itemData;
            }
        }

        // Fallback: create basic item data
        return {
            name: component.name,
            type: component.type || "loot",
            img: component.img,
            system: {
                quantity: component.quantity
            },
            flags: component.flags || {}
        };
    }
}
