import {CraftingApp} from './apps/CraftingApp.js';
import {RecipeSheet} from './apps/RecipeSheet.js';
import {Settings} from './Settings.js';
import {Crafting} from "./Crafting.js";
import {RecipeCompendium} from "./apps/RecipeCompendium.js";
import {AnyOfSheet} from "./apps/AnyOfSheet.js";
import {Recipe} from "./Recipe.js";
import {ActorSheetTab} from "./apps/ActorSheetTab.js";
import {
    itemTypeMigration,
    migrateDeprecateTools,
    migrateRecipeSkillToTests, migrateRecipeTestsToBeaversTests,
    migrateRecipeToOrConditions,
} from "./migration.js";
import {ActorSheetCraftedInventory} from "./apps/ActorSheetCraftedInventory.js";
import {CraftedItemSheet} from "./apps/CraftedItemSheet.js";
import "./compatibility/tidy5e.js";
import { hookChatLog } from "./apps/ChatLog.js";

// Import standalone system
import { BobsCraftingSystem } from './system/SystemApi.js';
import { SkillTest } from './system/tests/SkillTest.js';
import { AbilityTest } from './system/tests/AbilityTest.js';
import { ToolTest } from './system/tests/ToolTest.js';
import { IncrementStep } from './system/tests/IncrementStep.js';

// Initialize system on Foundry init
Hooks.once("init", async function(){
    console.log("Bob's Crafting Guide | Initializing standalone system");

    // Verify DnD 5e system
    if (game.system.id !== "dnd5e") {
        ui.notifications.error("Bob's Crafting Guide requires the DnD 5e system", {permanent: true});
        return;
    }

    // Create system singleton
    window.bobsCraftingSystem = BobsCraftingSystem.getInstance();

    // Register test classes
    window.bobsCraftingSystem.registerTest('SkillTest', SkillTest);
    window.bobsCraftingSystem.registerTest('AbilityTest', AbilityTest);
    window.bobsCraftingSystem.registerTest('ToolTest', ToolTest);
    window.bobsCraftingSystem.registerTest('IncrementStep', IncrementStep);

    console.log("Bob's Crafting Guide | System initialized");
});

async function migrate(){
    const version = Settings.get(Settings.MAJOR_VERSION);
    if(version == 2){
        await migrateDeprecateTools();
        await migrateRecipeSkillToTests();
        Settings.set(Settings.USE_TOOL,false);
        Settings.set(Settings.MAJOR_VERSION,3);
    }
    if(version == 3){
        await migrateRecipeToOrConditions();
    }
    if(version < 400){
        await new Promise(resolve => setTimeout(resolve, 10000));
        await migrateRecipeTestsToBeaversTests();
    }
    Settings.set(Settings.MAJOR_VERSION,400);
}

function debug(){
    const originalCall = Hooks.call;
    const originalCallAll = Hooks.callAll;

// Override Hooks.call
    Hooks.call = function (hookName, ...args) {
        console.log(`Hook executed: ${hookName}`, { args });
        return originalCall.call(this, hookName, ...args);
    };

// Override Hooks.callAll
    Hooks.callAll = function (hookName, ...args) {
        console.log(`Hook executed (callAll): ${hookName}`, { args });
        return originalCallAll.call(this, hookName, ...args);
    };
}

Hooks.once("ready", async function(){
    // Verify DnD 5e version
    const version = game.system.version;
    const major = parseInt(version.split('.')[0]);
    const minor = parseInt(version.split('.')[1]);

    if (major < 5 || (major === 5 && minor < 2)) {
        ui.notifications.warn(`Bob's Crafting Guide is designed for DnD 5e 5.2.4, you are running ${version}. Some features may not work correctly.`, {permanent: true});
    }

    Settings.init();
    if(!game[Settings.NAMESPACE])game[Settings.NAMESPACE]={};
    game[Settings.NAMESPACE].Crafting = Crafting;
    game[Settings.NAMESPACE].RecipeCompendium = RecipeCompendium;
    game[Settings.NAMESPACE].Recipe = Recipe;
    game[Settings.NAMESPACE].Settings = Settings;
    game[Settings.NAMESPACE].migrateRecipeAddItemType = itemTypeMigration;
    game[Settings.NAMESPACE].migrateRecipeSkillToTests= migrateRecipeSkillToTests;
    game[Settings.NAMESPACE].migrateDeprecateTools= migrateDeprecateTools;
    game[Settings.NAMESPACE].migrateRecipeToOrConditions= migrateRecipeToOrConditions;
    game[Settings.NAMESPACE].migrateRecipeTestsToBeaversTests= migrateRecipeTestsToBeaversTests;
    hookChatLog();
    migrate();

    // Note: Component comparison logic with crafted items is now handled directly in Component.ts
    // The isSame() method checks Settings.SEPARATE_CRAFTED_ITEMS automatically

    Hooks.on("renderActorSheet", (app, html, data)=>{
        if (app instanceof Application) {
            if (!Settings.isDisabledActor(app.actor)) {
                new ActorSheetTab(app, html, data);
            }
            new ActorSheetCraftedInventory(app, html, data);
        }
    });

    //SubTypeSheet
    Hooks.on(`renderItemSheet`, async (app, html, data) => {
      if (app instanceof Application) {
        await RecipeSheet.bind(app, html, data, 1);
        AnyOfSheet.bind(app, html, data);
        CraftedItemSheet.bind(app, html, data);
      }
    });

    Hooks.on(`renderApplicationV2`, async (app, html, data, options) => {
      await RecipeSheet.bind(app, html, data, 2);
      AnyOfSheet.bind(app, html, data, 2);
      CraftedItemSheet.bind(app, html, data);
      if (app.actor) {
        if (!Settings.isDisabledActor(app.actor)) {
          new ActorSheetTab(app, html, data);
        }
        new ActorSheetCraftedInventory(app, html, data);
      }
    });


//add Subtype to create Item
    Hooks.on("preCreateItem", (doc, createData, options, user) => {
        if (foundry.utils.getProperty(createData, `flags.${Settings.NAMESPACE}.subtype`) === 'recipe' ) {
            doc.updateSource({[`flags.${Settings.NAMESPACE}.subtype`]: Settings.RECIPE_SUBTYPE,"img":"icons/sundries/scrolls/scroll-worn-tan.webp"});
        }
        if (foundry.utils.getProperty(createData,`flags.${Settings.NAMESPACE}.subtype`) === 'anyOf' ) {
            doc.updateSource({[`flags.${Settings.NAMESPACE}.subtype`]: Settings.ANYOF_SUBTYPE,"img":"modules/bobs-crafting-guide/icons/anyOf.png"});
        }
    });

//evil TODO fix this make recipes own type !
// own type does not yet work for all supported systems.

    Hooks.on("getDialogHeaderButtons", (dialog,buttons) => {
        hookForCatchingDialogTitle(dialog,buttons) //v1
    });
    Hooks.on("getHeaderControlsApplicationV2", (dialog,buttons) => {
        hookForCatchingDialogTitle(dialog,buttons)
    });

    function hookForCatchingDialogTitle(dialog, buttons){
        if(Settings.get(Settings.CAPTURE_CREATE_ITEM_TITLE)) {
            var title = dialog.data?.title || dialog.options.window.title;
            var captureItemWindow = (e)=> {
                ui.notifications.info("Capture and set title of window for Bob's Crafting Guide module to "+title);
                Settings.set(Settings.CREATE_ITEM_TITLE, title);
                Settings.set(Settings.CAPTURE_CREATE_ITEM_TITLE,false);
                dialog.close()
            }
            buttons.unshift({
                action: "captureItemWindow",
                icon: "fas fa-bullseye",
                label: "capture item creation window",
                onClick: captureItemWindow,
                onclick: captureItemWindow
            });
        }
    }

    function hookForCatchingCreateItemDialog(app, html, version){
        if (version === 1 || app instanceof foundry.applications?.api?.ApplicationV2) {
            const title = game.settings.get(Settings.NAMESPACE, Settings.CREATE_ITEM_TITLE) || "Create New Item";
            if(!html.jquery) html = $(html);
            if (html[0]?.localName !== "div" && html[0]?.localName !== "dialog") {
                html = $(html[0].parentElement.parentElement);
            }
            let windowTitle = app.data?.title;//V1
            if(!windowTitle) windowTitle = app.options.window.title; //V2
            if (windowTitle === title || windowTitle === "Create Item" || windowTitle === "Create New Item") {
                if (game.system.id === "dnd5e" && game["dnd5e"].version.split(".")[0] >= 3) {
                    dnd5e(html);
                    app.setPosition({ height: "auto" });
                } else {
                    legacy(html);
                }
            }
        }
    }

    Hooks.on("renderDialog", (app, html, content) => {
        hookForCatchingCreateItemDialog(app,html,1);
    });

    Hooks.on("renderDialogV2", (app, html, content) => {
        hookForCatchingCreateItemDialog(app,html,2);
    });
    //dnd5e v5.2.x
    Hooks.on("renderCreateDocumentDialog", (app,html,content) => {
      hookForCatchingCreateItemDialog(app,html,2);
    });

    //pathfinder1
    Hooks.on("renderItemCreateDialog", (app, html, content) => {
        if(!html.jquery) html = $(html);
        legacy(html);
    });

    function legacy(html){
        const itemType = "loot"; // DnD 5e loot item type

        html.find("select[name='type']").append("<option value='"+itemType+"'>📜Recipe📜</option>");
        html.find("select[name='type']").append("<option value='"+itemType+"'>❔AnyOf❔</option>");
        if (html.find("input.subtype").length === 0) {
            var form = html.find("form");
            if(form.length === 0 && html.prop("tagName") === "FORM"){
                form = html;
            }
            form.append(`<input class="subtype" name="flags.${Settings.NAMESPACE}.subtype" style="display:none" value="">`);
        }

        html.find("select[name='type']").on("change", function (event) {
            const name = $(this).find("option:selected").text();
            let value = "";
            if (name === "📜Recipe📜") {
                event.stopPropagation();
                html.find("select[name='system.subType']").parent().parent().remove()
                value = "recipe"
            }
            if (name === "❔AnyOf❔") {
                event.stopPropagation();
                html.find("select[name='system.subType']").parent().parent().remove()
                value = "anyOf"
            }
            html.find("input.subtype").val(value);
        })
    }
    //temp quickwin
    function dnd5e(html){
        const itemType = "loot"; // DnD 5e loot item type
        html.find("ol.card").append(`<li>
            <label>
                <img src="icons/sundries/scrolls/scroll-worn-tan.webp" alt="Recipe">
                <span>Recipe</span>
                <input type="radio" data-subType="recipe" name="type" value="${itemType}">
            </label>
        </li><li>
            <label>
                <img src="modules/bobs-crafting-guide/icons/anyOf.png" alt="AnyOf">
                <span>AnyOf</span>
                <input type="radio" data-subType="anyOf" name="type" value="${itemType}">
            </label>
        </li><input class="subtype" name="flags.${Settings.NAMESPACE}.subtype" style="display:none" value="">`)
        html.find("input[type=radio]").on("click", function () {
            const subType = $(this).data("subtype");
            html.find("input.subtype").val(subType);
        })
    }

    getTemplate('modules/bobs-crafting-guide/templates/beavers-folders.hbs').then(t=>{
        Handlebars.registerPartial('beavers-folders', t);
    });
    getTemplate('modules/bobs-crafting-guide/templates/beavers-recipe-folder-item.hbs').then(t=>{
        Handlebars.registerPartial('beavers-recipe-folder-item', t);
    });
    getTemplate('modules/bobs-crafting-guide/templates/beavers-actor-folder-item.hbs').then(t=>{
        Handlebars.registerPartial('beavers-actor-folder-item', t);
    });
    getTemplate('modules/bobs-crafting-guide/templates/beavers-recipe-component.hbs').then(t=>{
        Handlebars.registerPartial('beavers-recipe-component', t);
    });
    getTemplate('modules/bobs-crafting-guide/templates/beavers-recipe.hbs').then(t=>{
        Handlebars.registerPartial('beavers-recipe', t);
    })
});

//fucking stupid handlebars !!!
Handlebars.registerHelper('beavers-isEmpty', function (value, options) {
    return value === undefined ||
    (value instanceof Object && Object.keys(value).length === 0) ||
    (value instanceof Array && value.length === 0)
});

Handlebars.registerHelper("beavers-objectLen", function(json) {
    return Object.keys(json).length;
});
Handlebars.registerHelper('beavers-split', function (input, delimiter) {
    if (typeof input === 'string') {
        return input.split(delimiter); // Split the string by the specified delimiter
    }
    return []; // Return an empty array if input is not a string
});

// Helper to create objects from key-value pairs
Handlebars.registerHelper('beavers-object', function(...args) {
    // Remove the last argument (Handlebars options object)
    args.pop();

    const obj = {};
    for (let i = 0; i < args.length; i += 2) {
        if (i + 1 < args.length) {
            obj[args[i]] = args[i + 1];
        }
    }
    return obj;
});

// Helper to render test UI based on test type
Handlebars.registerHelper('beavers-test', function(testData, options) {
    // Initialize with default if no test data
    if (!testData) {
        testData = { type: 'SkillTest', data: {} };
    }
    if (!testData.type) {
        testData.type = 'SkillTest';
    }
    if (!testData.data) {
        testData.data = {};
    }

    // Options can be either a Handlebars options object or a plain object from beavers-object helper
    const opts = options?.hash || options || {};
    const disabled = opts.disabled || false;
    const minimized = opts.minimized || false;
    const prefixName = opts.prefixName || '';

    // Get available test types
    const testTypes = [
        { value: 'SkillTest', label: 'Skill Check' },
        { value: 'AbilityTest', label: 'Ability Check' },
        { value: 'ToolTest', label: 'Tool Check' },
        { value: 'IncrementStep', label: 'Auto Progress' }
    ];

    let html = '<div class="beavers-test flexrow" style="align-items: center; gap: 5px;">';

    // Test type selection
    html += '<select class="beavers-test-selection" name="' + prefixName + '.type"' + (disabled ? ' disabled' : '') + ' style="flex: 0 0 auto;">';
    for (const type of testTypes) {
        html += '<option value="' + type.value + '"' + (testData.type === type.value ? ' selected' : '') + '>' + type.label + '</option>';
    }
    html += '</select>';

    // Test-specific configuration - always show, not just when testData.data exists
    if (!minimized) {
        if (testData.type === 'SkillTest') {
            const skills = CONFIG.DND5E.skills || {};
            html += '<select name="' + prefixName + '.data.skill"' + (disabled ? ' disabled' : '') + ' style="flex: 0 0 auto;">';
            for (const [key, skill] of Object.entries(skills)) {
                const skillLabel = skill.label ? game.i18n.localize(skill.label) : key;
                html += '<option value="' + key + '"' + (testData.data.skill === key ? ' selected' : '') + '>' + skillLabel + '</option>';
            }
            html += '</select>';
            html += '<label style="margin-left: 5px;">DC:</label><input type="number" name="' + prefixName + '.data.dc" value="' + (testData.data.dc || 10) + '"' + (disabled ? ' disabled' : '') + ' style="width:60px; flex: 0 0 auto;" />';
        } else if (testData.type === 'AbilityTest') {
            const abilities = CONFIG.DND5E.abilities || {};
            html += '<select name="' + prefixName + '.data.ability"' + (disabled ? ' disabled' : '') + ' style="flex: 0 0 auto;">';
            for (const [key, ability] of Object.entries(abilities)) {
                const abilityLabel = ability.label ? game.i18n.localize(ability.label) : key;
                html += '<option value="' + key + '"' + (testData.data.ability === key ? ' selected' : '') + '>' + abilityLabel + '</option>';
            }
            html += '</select>';
            html += '<label style="margin-left: 5px;">DC:</label><input type="number" name="' + prefixName + '.data.dc" value="' + (testData.data.dc || 10) + '"' + (disabled ? ' disabled' : '') + ' style="width:60px; flex: 0 0 auto;" />';
        } else if (testData.type === 'ToolTest') {
            html += '<label style="margin-left: 5px;">Tool:</label><input type="text" name="' + prefixName + '.data.tool" value="' + (testData.data.tool || '') + '" placeholder="e.g., Cook\'s Utensils"' + (disabled ? ' disabled' : '') + ' style="flex:1; min-width: 150px;" />';

            // Add ability selector for tool checks
            const abilities = CONFIG.DND5E.abilities || {};
            html += '<label style="margin-left: 5px;">Ability:</label>';
            html += '<select name="' + prefixName + '.data.ability"' + (disabled ? ' disabled' : '') + ' style="flex: 0 0 auto; margin-left: 5px;">';
            for (const [key, ability] of Object.entries(abilities)) {
                const abilityLabel = ability.label ? game.i18n.localize(ability.label) : key;
                html += '<option value="' + key + '"' + (testData.data.ability === key ? ' selected' : '') + '>' + abilityLabel + '</option>';
            }
            html += '</select>';

            html += '<label style="margin-left: 5px;">DC:</label><input type="number" name="' + prefixName + '.data.dc" value="' + (testData.data.dc || 10) + '"' + (disabled ? ' disabled' : '') + ' style="width:60px; flex: 0 0 auto;" />';
        } else if (testData.type === 'IncrementStep') {
            html += '<span style="margin-left:10px; font-style: italic;">Auto-progress (no roll required)</span>';
        }
    }

    html += '</div>';

    return new Handlebars.SafeString(html);
});