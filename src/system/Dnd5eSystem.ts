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
        // @ts-ignore - Foundry VTT global
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
    // @ts-ignore - Foundry VTT Actor type
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
    // @ts-ignore - Foundry VTT Actor type
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
    // @ts-ignore - Foundry VTT Actor type
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
     * Check if an actor is a wizard
     * @param actor The actor to check
     * @returns True if the actor has wizard class levels
     */
    // @ts-ignore - Foundry VTT Actor type
    private isWizard(actor: Actor): boolean {
        // @ts-ignore
        const classes = actor.classes;
        if (!classes) return false;

        // Check if wizard class exists and has levels
        const wizardClass = classes.wizard;
        return wizardClass && wizardClass.system?.levels > 0;
    }

    /**
     * Get the wizard level of an actor
     * @param actor The actor
     * @returns Wizard level or 0 if not a wizard
     */
    // @ts-ignore - Foundry VTT Actor type
    private getWizardLevel(actor: Actor): number {
        // @ts-ignore
        const wizardClass = actor.classes?.wizard;
        return wizardClass?.system?.levels || 0;
    }

    /**
     * Calculate the maximum spell level a wizard can learn based on their level
     * @param wizardLevel The wizard's class level
     * @returns Maximum spell level (0-9)
     */
    private getMaxSpellLevel(wizardLevel: number): number {
        if (wizardLevel >= 17) return 9;
        if (wizardLevel >= 15) return 8;
        if (wizardLevel >= 13) return 7;
        if (wizardLevel >= 11) return 6;
        if (wizardLevel >= 9) return 5;
        if (wizardLevel >= 7) return 4;
        if (wizardLevel >= 5) return 3;
        if (wizardLevel >= 3) return 2;
        if (wizardLevel >= 1) return 1;
        return 0;
    }

    /**
     * Handle learning a spell from crafting
     * Validates that the actor is a wizard and high enough level
     * @param actor The actor learning the spell
     * @param spellItem The spell item to learn
     * @throws Error if validation fails
     */
    // @ts-ignore - Foundry VTT Actor type
    private async validateAndPrepareSpell(actor: Actor, spellItem: any): Promise<void> {
        const spellLevel = spellItem.system?.level ?? 0;
        const spellName = spellItem.name;

        // Check if actor is a wizard
        if (!this.isWizard(actor)) {
            const errorMsg = `${actor.name} must be a wizard to learn spells from crafting.`;
            // @ts-ignore
            ui.notifications.error(errorMsg);
            throw new Error(errorMsg);
        }

        // Get wizard level and max spell level
        const wizardLevel = this.getWizardLevel(actor);
        const maxSpellLevel = this.getMaxSpellLevel(wizardLevel);

        // Check if wizard is high enough level for this spell
        if (spellLevel > maxSpellLevel) {
            const errorMsg = `${actor.name} is a level ${wizardLevel} wizard and cannot learn ${spellName} (a level ${spellLevel} spell). Wizards can learn level ${spellLevel} spells at wizard level ${this.getMinLevelForSpell(spellLevel)}.`;
            // @ts-ignore
            ui.notifications.error(errorMsg);
            throw new Error(errorMsg);
        }

        // Check if spell is already in spellbook
        // @ts-ignore - Foundry VTT items collection
        const existingSpell = actor.items.find(i => i.type === "spell" && i.name === spellName);
        if (existingSpell) {
            const warnMsg = `${actor.name} already knows ${spellName}.`;
            // @ts-ignore
            ui.notifications.warn(warnMsg);
            throw new Error(warnMsg);
        }
    }

    /**
     * Get the minimum wizard level required to learn a spell of given level
     * @param spellLevel The spell level (0-9)
     * @returns Minimum wizard level required
     */
    private getMinLevelForSpell(spellLevel: number): number {
        switch (spellLevel) {
            case 0: return 1;
            case 1: return 1;
            case 2: return 3;
            case 3: return 5;
            case 4: return 7;
            case 5: return 9;
            case 6: return 11;
            case 7: return 13;
            case 8: return 15;
            case 9: return 17;
            default: return 1;
        }
    }

    /**
     * Get the spell item from a component
     * @param component The component representing a spell
     * @returns The spell item or null
     */
    private async getSpellItemFromComponent(component: Component): Promise<any> {
        if (component.uuid) {
            // @ts-ignore - Foundry VTT global function
            const item = await fromUuid(component.uuid);
            // @ts-ignore - Foundry VTT item type
            if (item && item.type === "spell") {
                return item;
            }
        }
        return null;
    }

    /**
     * Add or remove components from an actor's inventory
     * @param actor The actor
     * @param components List of components (negative quantity = remove)
     * @returns Changes made (for rollback)
     */
    // @ts-ignore - Foundry VTT Actor type
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
                // @ts-ignore - Foundry VTT global function
                const table = await fromUuid(component.uuid);
                // @ts-ignore - Foundry VTT RollTable type
                if (table && table instanceof RollTable) {
                    // @ts-ignore
                    const results = await table.drawMany(component.quantity, {displayChat: false});
                    for (const result of results.results) {
                        if (result.type === 0) { // Text result
                            continue;
                        }
                        // Get the item from the result
                        // @ts-ignore - Foundry VTT global function
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
                // Check if this is a spell - validate before adding
                if (component.type === "spell") {
                    // Get the spell item to validate
                    const spellItem = await this.getSpellItemFromComponent(component);
                    if (spellItem) {
                        // Validate wizard class and level
                        await this.validateAndPrepareSpell(actor, spellItem);

                        // If validation passes, add the spell to spellbook
                        const spellData = spellItem.toObject();
                        // Set spell as unprepared by default
                        if (spellData.system.preparation) {
                            spellData.system.preparation.prepared = false;
                        }
                        toCreate.push(spellData);

                        // Log success
                        console.log(`[Dnd5eSystem] ${actor.name} learned spell: ${spellItem.name}`);
                        // @ts-ignore
                        ui.notifications.info(`${actor.name} learned ${spellItem.name}!`);
                    } else {
                        // Spell item not found, treat as regular item
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
                    }
                } else {
                    // Not a spell - handle normally
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
                        // @ts-ignore - Foundry VTT global namespace
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
    // @ts-ignore - Foundry VTT Actor type
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
            // @ts-ignore - Foundry VTT global function
            const sourceItem = await fromUuid(component.uuid);
            if (sourceItem) {
                const itemData = sourceItem.toObject();
                itemData.system.quantity = component.quantity;
                // Apply flags
                if (component.flags) {
                    // @ts-ignore - Foundry VTT global namespace
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
