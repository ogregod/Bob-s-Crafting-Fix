import { Recipe } from "../Recipe.js";
import { Settings } from "../Settings.js";
import { getDataFrom } from "../helpers/Utility.js";
import { AnyOf } from "../AnyOf.js";
import {Component} from "../system/Component.js";
import {Dnd5eCurrency} from "../system/currency/Dnd5eCurrency.js";
import {SheetIntegration} from "../system/ui/SheetIntegration.js";

const recipeSheets: { [key: string]: RecipeSheet } = {};

export class RecipeSheet {
  app;
  item;
  recipe: Recipe;
  recipeElement?;
  sheet: {
    active: string
  };

  static async bind(app, html, data, version) {
    if (Recipe.isRecipe(app.item)) {
      app.recipeSheet = this;
      app.version = version;
      if (!recipeSheets[app.id]) {
        recipeSheets[app.id] = new RecipeSheet(app);
      }
      recipeSheets[app.id].init(html);
      if (!app.initialized) {
        let width = 700;
        let height: any = 500;
        if (app.options.position) {//applicationV2
          if (app.options.position.height != "auto") {
            app.options.position.height = height;
          } else {
            height = "auto";
          }
          app.options.position.width = width;
        } else {
          app.options.height = height;
          app.options.width = width;
        }
        app.setPosition({ height: height, width: width });
      }
      app.initialized = true;

      app._onResize = (e) => {
        if (app.options.position) {//applicationV2
          app.options.position.height = app.position.height;
          app.options.position.width = app.position.width;
        } else {//applicationV1
          app.options.height = app.position.height;
          app.options.width = app.position.width;
        }
      };
      if (app.options.window.resizable !== undefined) {
        if (app.options.window.resizable !== true) {
          app.options.window.resizable = true;
          await app.close({ animate: false }).catch(() => {
          });
          await app.render(true);
        }
      }
    }
  }

  constructor(app) {
    this.app = app;
    this.item = app.item;
    this.sheet = {
      active: "main",
    };
  }

  get editable() {
    return this.app.options.editable ||
      (this.app.isEditable && (this.app._mode == undefined || this.app._mode == 2)); //V2 or DNDv5 ? //apparently it can change in V2
  }

  init(html) {
    if (html[0].localName !== "div") {
      html = $(html[0].parentElement.parentElement);
    }
    let exists = html.find(".beavers-recipe-sheet");
    if (exists.length != 0) {
      if (this.app.version === 1) {
        return; //do not repaint
      } else {
        exists.remove(); // repaint everything
      }
    }
    this.recipeElement = $("<div class=\"beavers-crafting\" style=\"height:100%;width:100%;padding:15px;\"></div>");
    if (!this.app.form) {
      this.recipeElement = $("<form class=\"beavers-crafting\" style=\"height:100%;width:100%;padding:15px;\"></form>");
    }
    SheetIntegration.replaceContent(this.app, html, this.recipeElement);
    this.recipe = Recipe.fromItem(this.item);
    this.render().then(i => this.addDragDrop());
  }

  addDragDrop() {
    if (this.editable) {
      var recipeSheetDragDrop = this.app._dragDrop?.filter(d => d.name == "recipeSheet")[0];
      if (recipeSheetDragDrop && this.app.version === 1) {
        recipeSheetDragDrop.bind(this.recipeElement[0]);
        return;
      }
      const DragDropImpl = ((foundry as any).applications?.ux?.DragDrop?.implementation) || DragDrop;
      const dragDrop = new DragDropImpl({
        dropSelector: ".drop-area",
        permissions: {
          dragstart: () => true,
          drop: () => true,
        },
        callbacks: {
          dragstart: this.app._onDragStart.bind(this.app),
          dragover: this.app._onDragOver.bind(this.app),
          drop: this._onDrop.bind(this),
        },
      });
      dragDrop["name"] = "recipeSheet";
      this.app?._dragDrop?.push(dragDrop);
      dragDrop.bind(this.recipeElement[0]);
    }
  }

  async render() {
    console.log("[RecipeSheet] Starting render...");
    console.log("[RecipeSheet] Item data:", {
      name: this.item.name,
      system: this.item.system,
      flags: this.item.flags
    });

    const renderTemplateFunc = ((foundry as any).applications?.handlebars?.renderTemplate || renderTemplate) as typeof renderTemplate;
    let main = await renderTemplateFunc("modules/bobs-crafting-guide/templates/recipe-main.hbs",
      {
        recipe: this.recipe,
        currencies: Dnd5eCurrency.CURRENCIES,
        editable: this.editable,
        displayResults: Settings.get(Settings.DISPLAY_RESULTS),
        displayIngredients: Settings.get(Settings.DISPLAY_RESULTS),
        useAttendants: Settings.get(Settings.USE_ATTENDANTS),
        canRollAbility: true, // DnD 5e always supports ability rolls
        hasCraftedFlag: Settings.get(Settings.SEPARATE_CRAFTED_ITEMS) !== "none",
      });

    console.log("[RecipeSheet] Main tab rendered");

    // Log item.system values to identify "[object Object]" errors
    console.log("[RecipeSheet] item.system.weight:", this.item.system?.weight, typeof this.item.system?.weight);
    console.log("[RecipeSheet] item.system.price:", this.item.system?.price, typeof this.item.system?.price);
    console.log("[RecipeSheet] item.system.price.value:", this.item.system?.price?.value, typeof this.item.system?.price?.value);
    console.log("[RecipeSheet] item.system.price.denomination:", this.item.system?.price?.denomination, typeof this.item.system?.price?.denomination);
    console.log("[RecipeSheet] item.system.rarity:", this.item.system?.rarity, typeof this.item.system?.rarity);
    console.log("[RecipeSheet] item.system.chatFlavor:", this.item.system?.chatFlavor, typeof this.item.system?.chatFlavor);
    console.log("[RecipeSheet] item.system.unidentified:", this.item.system?.unidentified, typeof this.item.system?.unidentified);

    let description = "";
    if (game["version"].split(".")[0] >= 12) {
      description = await renderTemplateFunc("modules/bobs-crafting-guide/templates/recipe-descriptionV12.hbs",
        {
          recipe: this.recipe,
          item: this.item,
          editable: this.editable,
        });
    } else {
      description = await renderTemplateFunc("modules/bobs-crafting-guide/templates/recipe-description.hbs",
        {
          recipe: this.recipe,
          item: this.item,
          editable: this.editable,
        });
    }

    console.log("[RecipeSheet] Description tab rendered");

    let template = await renderTemplateFunc("modules/bobs-crafting-guide/templates/recipe-sheet.hbs", {
      main: main,
      description: description,
      active: this.sheet.active,
      advanced: "test",
      recipe: this.recipe,
    });
    this.recipeElement.find(".beavers-recipe-sheet").remove();
    this.recipeElement.append(template);
    if (this.app.scrollToPosition) {
      this.recipeElement.scrollTop(this.app.scrollToPosition);
    }

    // Populate test presets dropdown
    const presets = ((game as Game).settings.get(Settings.NAMESPACE, "testPresets") as any) || {};
    const presetsDropdown = this.recipeElement.find(".load-test-preset");

    // Clear existing options except first
    presetsDropdown.find("option:not(:first)").remove();

    // Add preset options
    for (const [name, preset] of Object.entries(presets)) {
      presetsDropdown.append(`<option value="${name}">${name}</option>`);
    }

    this.handleEvents();
    console.log("[RecipeSheet] Render complete");
  }

  handleEvents() {
    if (game["version"].split(".")[0] < 12) {
      this.app._activateEditor?.(this.recipeElement.find(".editor-content")[0]);
    }
    this.recipeElement.find(".tabs a").click(e => {
      this.sheet.active = $(e.currentTarget).data("tab");
      this.render();
    });

    this.handleMainEvents();
  }

  async _onDrop(e) {
    await this._onDropMain(e);
  }

  async update() {
    console.log("[RecipeSheet] Starting update...");

    let update: any = { flags: {} };
    const formData = this.getFormData();

    console.log("[RecipeSheet] Form data collected:", formData);

    // Separate recipe flags from item system data
    const systemData: any = {};
    let itemName: string | undefined = undefined;

    for (const [key, value] of Object.entries(formData)) {
      if (key.startsWith("flags.beavers-crafting.recipe.")) {
        // Recipe-specific data
        let recipeKey = key.replace("flags.beavers-crafting.recipe.", "");
        foundry.utils.setProperty(this.recipe, recipeKey, value);
      } else if (key.startsWith("system.")) {
        // Item system data (weight, price, rarity, etc.)
        let systemKey = key.replace("system.", "");
        foundry.utils.setProperty(systemData, systemKey, value);
      } else if (key === "name") {
        // Item name
        itemName = value as string;
      }
    }

    // Build update object
    update.flags[Settings.NAMESPACE] = {
      recipe: this.recipe.serialize(),
    };

    // Add system data if any changed
    if (Object.keys(systemData).length > 0) {
      // Ensure price object structure
      if (systemData["price"]) {
        if (!systemData["price"]["value"]) systemData["price"]["value"] = 0;
        if (!systemData["price"]["denomination"]) systemData["price"]["denomination"] = 'gp';
      }
      update.system = systemData;
      console.log("[RecipeSheet] System data to update:", systemData);
    }

    // Add name if changed
    if (itemName !== undefined) {
      update.name = itemName;
      console.log("[RecipeSheet] Name to update:", itemName);
    }

    console.log("[RecipeSheet] Final update object:", update);

    await this.item.update(update, { performDeletions: true });
    this.recipe = Recipe.fromItem(this.item);

    if (this.recipeElement) {
      this.app.scrollToPosition = this.recipeElement.scrollTop();
    }

    await this.render();
    console.log("[RecipeSheet] Update complete");
  }

  getFormData() {
    console.log("[RecipeSheet] Collecting form data...");
    let data = {};
    // @ts-ignore
    const elements = this.recipeElement[0].querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea, prose-mirror",
    );
    for (let el of elements) {
      let element = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

      if (element.name) { //make sure the element has a name attribute.
        // Check for element type
        if (element.type === "number") {
          data[element.name] = element.value ? parseFloat(element.value) : null;
        } else if (element.type === "checkbox" && element instanceof HTMLInputElement) {
          data[element.name] = element.checked;
        } else if (element.type === "select-one" || element.type === "select-multiple") {
          let select: HTMLSelectElement = el as HTMLSelectElement;
          let selectedValues = Array.from(select.selectedOptions)
            .map(option => option.value);
          // Handle select-one as single value, not array
          data[element.name] = (element.type === "select-one" && selectedValues.length === 1) ? selectedValues[0] : selectedValues;
        } else if (element.type === "textarea") {
          data[element.name] = element.value;
        } else {
          data[element.name] = element.value;
        }

        console.log(`[RecipeSheet] Field ${element.name} = ${data[element.name]}`);
      }
    }
    console.log("[RecipeSheet] Collected data:", data);
    return data;
  }

  handleMainEvents() {
    this.recipeElement.find(".beavers-fontsize-svg-img").click(e => {
      const group = e.target.dataset.group;
      const type = e.target.dataset.type;
      const key = e.target.dataset.key;
      const name = `${type}.${group}.${key}.flags.${Settings.NAMESPACE}.isCrafted`;
      const value = foundry.utils.getProperty(this.recipe, name);
      if (value) {
        foundry.utils.setProperty(this.recipe, name, null);
      } else {
        foundry.utils.setProperty(this.recipe, name, true);
      }
      this.update();
    });

    this.recipeElement.find(".ingredients .item-delete").click(e => {
      this.recipe.removeInput(e.target.dataset.group, e.target.dataset.id);
      this.update();
    });
    this.recipeElement.find(".results .item-delete").click(e => {
      this.recipe.removeOutput(e.target.dataset.group, e.target.dataset.id);
      this.update();
    });
    this.recipeElement.find(".attendants .item-delete").click(e => {
      this.recipe.removeRequired(e.target.dataset.group, e.target.dataset.id);
      this.update();
    });
    this.recipeElement.find(".currencies .item-delete").click(async e => {
      this.recipe.removeCurrency();
      await this.render();
      this.update();
    });
    this.recipeElement.find(".cost .item-add").click(e => {
      this.recipe.addCurrency();
      this.update();
    });
    this.recipeElement.find(".tests .testAnd .item-add").click(e => {
      this.recipe.addTestAnd();
      this.update();
    });
    this.recipeElement.find(".tests .testOr .item-add").click(async e => {
      const and = $(e.currentTarget).data("and");
      this.recipe.addTestOr(and);
      //first rerender so we get rid of the old data in form.
      await this.render();
      this.update();
    });
    this.recipeElement.find(".tests .item-delete").click(async e => {
      const and = $(e.currentTarget).data("and");
      const or = $(e.currentTarget).data("or");
      this.recipe.removeTestOr(and, or);
      //first rerender so we get rid of the old data in form.
      await this.render();
      this.update();
    });

    this.recipeElement.find(".beavers-test-selection select").on("change", async e => {
      const name = e.target.name;
      const { ands: and, ors: or } = name.split(".").reduce((result, item, index, array) =>
        (item === "ands" || item === "ors") ? { ...result, [item]: array[index + 1] } : result, {});
      const type = $(e.target).val() as string;
      if (this.recipe.beaversTests?.ands[and]?.ors[or]) {
        this.recipe.beaversTests.ands[and].ors[or].type = type;
        this.recipe.beaversTests.ands[and].ors[or].data = {};
      }
      //first rerender so we get rid of the old data in form.
      await this.render();
      await this.update();
    });
    //fix some systems e.g. a5e does not update for selects
    this.recipeElement.find(".beavers-test select:not(.beavers-test .beavers-test-selection select)").on("change", async e => {
      e;
      //fix also dnd5e v5
      const name = e.target.name;
      const value = $(e.target).val() as string;
      const cleanedString = name.replace("flags.beavers-crafting.recipe.", "");
      foundry.utils.setProperty(this.recipe, cleanedString, value);
      await this.update();
    });
    this.recipeElement.find("input, .currencies select, .advanced textarea").on("change", async e => {
      e;
      await this.update();
    });

    this.recipeElement.find(".results .beavers-component .clickable").on("click", e => {
      const uuid = $(e.currentTarget).data("id");
      if (Settings.get(Settings.DISPLAY_RESULTS)) {
        fromUuid(uuid).then(i => {if(i) (i as any).sheet.render(true)});
      }
    });
    this.recipeElement.find(".ingredients .beavers-component .clickable").on("click", e => {
      const uuid = $(e.currentTarget).data("id");
      if (Settings.get(Settings.DISPLAY_INGREDIENTS)) {
        fromUuid(uuid).then(i => {if(i) (i as any).sheet.render(true)});
      }
    });
    this.recipeElement.find(".attendants .beavers-component .clickable").on("click", e => {
      const uuid = $(e.currentTarget).data("id");
      if (Settings.get(Settings.DISPLAY_INGREDIENTS)) {
        fromUuid(uuid).then(i => {if(i) (i as any).sheet.render(true)});
      }
    });

    // Quick-add test buttons
    this.recipeElement.find(".quick-add-test").click(async e => {
      console.log("[RecipeSheet] Quick-add test clicked");
      const testType = $(e.currentTarget).data("test-type");
      console.log("[RecipeSheet] Test type:", testType);

      // Add a new AND group
      this.recipe.addTestAnd();

      if (!this.recipe.beaversTests) return;

      // Get the newly added AND key
      const andKeys = Object.keys(this.recipe.beaversTests.ands).sort((a, b) => parseInt(a) - parseInt(b));
      const newAndKey = andKeys[andKeys.length - 1];

      // Set the test type for the first OR in the new AND group
      const orKeys = Object.keys(this.recipe.beaversTests.ands[newAndKey].ors);
      if (orKeys.length > 0) {
        this.recipe.beaversTests.ands[newAndKey].ors[orKeys[0]].type = testType;

        // Set default data based on test type
        switch (testType) {
          case 'SkillTest':
            this.recipe.beaversTests.ands[newAndKey].ors[orKeys[0]].data = { skill: 'acr', dc: 10 };
            break;
          case 'AbilityTest':
            this.recipe.beaversTests.ands[newAndKey].ors[orKeys[0]].data = { ability: 'str', dc: 10 };
            break;
          case 'ToolTest':
            this.recipe.beaversTests.ands[newAndKey].ors[orKeys[0]].data = { tool: '', dc: 10 };
            break;
          case 'IncrementStep':
            this.recipe.beaversTests.ands[newAndKey].ors[orKeys[0]].data = {};
            break;
        }
      }

      console.log("[RecipeSheet] Test added, rendering...");
      await this.render();
      await this.update();
    });

    // Collapsible test cards
    this.recipeElement.find("[data-collapse-target]").click(e => {
      const target = $(e.currentTarget).data("collapse-target");
      const content = this.recipeElement.find(`#${target}`);
      const icon = $(e.currentTarget).find(".fa-chevron-down, .fa-chevron-right");

      content.slideToggle(200);
      icon.toggleClass("fa-chevron-down fa-chevron-right");
    });

    // Save test preset
    this.recipeElement.find(".save-test-preset").click(async e => {
      console.log("[RecipeSheet] Save preset clicked");

      if (!this.recipe.beaversTests || Object.keys(this.recipe.beaversTests.ands || {}).length === 0) {
        ui.notifications?.warn("No tests to save as preset");
        return;
      }

      // Prompt for preset name
      const name: string = await new Promise((resolve) => {
        new Dialog({
          title: "Save Test Preset",
          content: `
            <div class="form-group">
              <label>Preset Name:</label>
              <input type="text" name="preset-name" placeholder="e.g., Easy Crafting Check" autofocus/>
            </div>
          `,
          buttons: {
            save: {
              label: "Save",
              callback: (html) => {
                const inputName = (html as JQuery).find('input[name="preset-name"]').val() as string;
                resolve(inputName);
              }
            },
            cancel: {
              label: "Cancel",
              callback: () => resolve("")
            }
          },
          default: "save"
        }).render(true);
      });

      if (!name) return;

      // Save to game settings
      const presets = ((game as Game).settings.get(Settings.NAMESPACE, "testPresets") as any) || {};
      presets[name] = JSON.parse(JSON.stringify(this.recipe.beaversTests));
      await (game as Game).settings.set(Settings.NAMESPACE, "testPresets", presets);

      console.log("[RecipeSheet] Preset saved:", name);
      ui.notifications?.info(`Test preset "${name}" saved`);

      // Re-render to update preset dropdown
      await this.render();
    });

    // Load test preset
    this.recipeElement.find(".load-test-preset").change(async e => {
      const presetName = $(e.currentTarget).val() as string;
      if (!presetName) return;

      console.log("[RecipeSheet] Loading preset:", presetName);

      const presets = ((game as Game).settings.get(Settings.NAMESPACE, "testPresets") as any) || {};
      const preset = presets[presetName];

      if (!preset) {
        ui.notifications?.error("Preset not found");
        return;
      }

      // Apply preset to current recipe
      this.recipe.beaversTests = JSON.parse(JSON.stringify(preset));

      console.log("[RecipeSheet] Preset loaded, rendering...");
      await this.render();
      await this.update();

      ui.notifications?.info(`Test preset "${presetName}" loaded`);
    });
  }


  async _onDropMain(e) {
    const isDrop = $(e.target).hasClass("drop-area");
    const isInput = $(e.target).parents(".beavers-recipe-sheet .ingredients").length !== 0;
    const isOutput = $(e.target).parents(".beavers-recipe-sheet .results").length !== 0;
    const isRequired = $(e.target).parents(".beavers-recipe-sheet .attendants").length !== 0;
    if (!isDrop && !isInput && !isOutput && !isRequired) {
      return;
    }
    const data = getDataFrom(e);
    if (data &&
      (data.type === "Item" ||
        (data.type === "RollTable" && isOutput)
      )
    ) {
      const entity = await fromUuid(data.uuid);
      if (entity) {
        const isAnyOf = AnyOf.isAnyOf(entity);
        if (isAnyOf && isOutput) {
          return;
        }
        const component = Component.fromEntity(entity);
        component.type = data.type;
        if (isInput) {
          let keyid = data.uuid;
          if (AnyOf.isAnyOf(entity)) {
            component.type = Settings.ANYOF_SUBTYPE;
            keyid = foundry.utils.randomID();
          }
          this.recipe.addInput(component, keyid, $(e.target).data("id"));
        }
        if (isOutput) {
          this.recipe.addOutput(component, data.uuid, $(e.target).data("id"));
        }
        if (isRequired) {
          let keyid = data.uuid;
          if (AnyOf.isAnyOf(entity)) {
            component.type = Settings.ANYOF_SUBTYPE;
            keyid = foundry.utils.randomID();
          }
          this.recipe.addRequired(component, keyid, $(e.target).data("id"));
        }
        this.update();
      }
    }
  }
}