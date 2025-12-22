/**
 * DnD 5e Currency Management
 * Handles currency operations for DnD 5e (pp, gp, ep, sp, cp)
 */

import { CurrencyConfig } from '../Dnd5eSystem.js';

export interface Currency {
    name: string;
    value: number;
}

/**
 * DnD 5e currency management
 */
export class Dnd5eCurrency {
    static CURRENCIES: CurrencyConfig[] = [
        { id: "pp", label: "DND5E.CurrencyPP", abbreviation: "DND5E.CurrencyAbbrPP", conversion: 10, component: undefined },
        { id: "gp", label: "DND5E.CurrencyGP", abbreviation: "DND5E.CurrencyAbbrGP", conversion: 1, component: undefined },
        { id: "ep", label: "DND5E.CurrencyEP", abbreviation: "DND5E.CurrencyAbbrEP", conversion: 0.5, component: undefined },
        { id: "sp", label: "DND5E.CurrencySP", abbreviation: "DND5E.CurrencyAbbrSP", conversion: 0.1, component: undefined },
        { id: "cp", label: "DND5E.CurrencyCP", abbreviation: "DND5E.CurrencyAbbrCP", conversion: 0.01, component: undefined }
    ];

    /**
     * Check if an actor can afford a currency change
     * @param actor The actor
     * @param currencies Currency changes (negative = cost, positive = gain)
     * @returns True if affordable
     */
    static async actorCurrenciesCanAdd(actor: Actor, currencies: {[key: string]: number}): Promise<boolean> {
        // Calculate total value needed (for negative amounts)
        let totalValueNeeded = 0;
        for (const [id, amount] of Object.entries(currencies)) {
            if (amount < 0) {
                const currency = this.CURRENCIES.find(c => c.id === id);
                if (!currency) {
                    console.warn(`Unknown currency: ${id}`);
                    continue;
                }
                totalValueNeeded += Math.abs(amount) * currency.conversion;
            }
        }

        if (totalValueNeeded === 0) {
            return true; // No cost
        }

        // Calculate actor's total wealth in gold pieces
        let totalValue = 0;
        for (const curr of this.CURRENCIES) {
            // @ts-ignore
            const actorAmount = actor.system.currency[curr.id] || 0;
            totalValue += actorAmount * curr.conversion;
        }

        return totalValue >= totalValueNeeded;
    }

    /**
     * Add or remove currency from an actor
     * @param actor The actor
     * @param currencies Currency changes (negative = remove, positive = add)
     * @param allowExchange If true, will exchange between denominations
     */
    static async actorCurrenciesAdd(actor: Actor, currencies: {[key: string]: number}, allowExchange: boolean = false): Promise<void> {
        const updates: any = {};

        // First, try simple addition without exchange
        let needsExchange = false;
        for (const [id, amount] of Object.entries(currencies)) {
            // @ts-ignore
            const currentAmount = actor.system.currency[id] || 0;
            const newAmount = currentAmount + amount;

            if (newAmount < 0) {
                if (allowExchange) {
                    needsExchange = true;
                } else {
                    throw new Error(`Insufficient ${id}: have ${currentAmount}, need ${Math.abs(amount)}`);
                }
            } else {
                updates[`system.currency.${id}`] = newAmount;
            }
        }

        if (needsExchange) {
            // Complex case: need to exchange between currencies
            await this.actorCurrenciesAddWithExchange(actor, currencies);
        } else {
            // Simple case: direct addition
            await actor.update(updates);
        }
    }

    /**
     * Add currency with automatic exchange between denominations
     * @param actor The actor
     * @param currencies Currency changes
     */
    private static async actorCurrenciesAddWithExchange(actor: Actor, currencies: {[key: string]: number}): Promise<void> {
        // Get current currency values
        const current: {[key: string]: number} = {};
        for (const curr of this.CURRENCIES) {
            // @ts-ignore
            current[curr.id] = actor.system.currency[curr.id] || 0;
        }

        // Apply changes
        for (const [id, amount] of Object.entries(currencies)) {
            current[id] = (current[id] || 0) + amount;
        }

        // Convert all to copper pieces (smallest denomination)
        let totalCopper = 0;
        for (const curr of this.CURRENCIES) {
            const amount = current[curr.id] || 0;
            totalCopper += amount * (curr.conversion * 100); // Convert to cp
        }

        if (totalCopper < 0) {
            throw new Error("Insufficient currency for transaction");
        }

        // Convert back to highest denominations
        const newCurrency: {[key: string]: number} = {
            pp: 0,
            gp: 0,
            ep: 0,
            sp: 0,
            cp: 0
        };

        // Convert to platinum (1000 cp = 1 pp)
        newCurrency.pp = Math.floor(totalCopper / 1000);
        totalCopper = totalCopper % 1000;

        // Convert to gold (100 cp = 1 gp)
        newCurrency.gp = Math.floor(totalCopper / 100);
        totalCopper = totalCopper % 100;

        // Convert to electrum (50 cp = 1 ep)
        newCurrency.ep = Math.floor(totalCopper / 50);
        totalCopper = totalCopper % 50;

        // Convert to silver (10 cp = 1 sp)
        newCurrency.sp = Math.floor(totalCopper / 10);
        totalCopper = totalCopper % 10;

        // Remaining copper
        newCurrency.cp = totalCopper;

        // Update actor
        const updates: any = {};
        for (const [id, amount] of Object.entries(newCurrency)) {
            updates[`system.currency.${id}`] = amount;
        }

        await actor.update(updates);
    }

    /**
     * Get total wealth in gold pieces
     * @param actor The actor
     * @returns Total wealth in GP
     */
    static getActorWealthInGold(actor: Actor): number {
        let total = 0;
        for (const curr of this.CURRENCIES) {
            // @ts-ignore
            const amount = actor.system.currency[curr.id] || 0;
            total += amount * curr.conversion;
        }
        return total;
    }

    /**
     * Get actor's currency
     * @param actor The actor
     * @returns Currency object
     */
    static getActorCurrencies(actor: Actor): {[key: string]: number} {
        const currencies: {[key: string]: number} = {};
        for (const curr of this.CURRENCIES) {
            // @ts-ignore
            currencies[curr.id] = actor.system.currency[curr.id] || 0;
        }
        return currencies;
    }
}
