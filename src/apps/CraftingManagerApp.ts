import {CraftingApp} from "./CraftingApp.js";
import {Crafting} from "../Crafting.js";
import {Settings} from "../Settings.js";
import { sortByFolder } from "../helpers/Folder.js";

export class CraftingManagerApp extends Application {
    actor: Actor;
    craftingApp: CraftingApp;
    craftingList: {
        [key:string]: Crafting
    } = {};
    private _hasBeenCentered: boolean = false;

    constructor(actor, options: any = {}) {
        super(options);
        this.actor = actor;
        this.craftingApp = new CraftingApp(actor, {popOut: false});
        this._hasBeenCentered = false;
    }

    static get defaultOptions() {
        const savedWidth = Settings.get(Settings.CRAFTING_APP_WIDTH) || 1000;
        const savedHeight = Settings.get(Settings.CRAFTING_APP_HEIGHT) || 600;

        const maxWidth = Math.min(1400, window.innerWidth * 0.9);
        const maxHeight = Math.min(900, window.innerHeight * 0.9);

        const width = Math.min(savedWidth, maxWidth);
        const height = Math.min(savedHeight, maxHeight);

        return foundry.utils.mergeObject(super.defaultOptions, {
            // @ts-ignore
            title: game.i18n.localize(`beaversCrafting.manager.title`) || "Crafting Manager",
            width: width,
            height: height,
            template: "modules/bobs-crafting-guide/templates/crafting-manager.hbs",
            closeOnSubmit: false,
            submitOnClose: false,
            resizable: true,
            classes: ["sheet", "beavers-crafting", "crafting-manager"],
            popOut: true,
            id: 'beavers-crafting-manager'
        });
    }

    async close(options?: Application.CloseOptions){
        Settings.set(Settings.CRAFTING_APP_WIDTH, this.position.width);
        Settings.set(Settings.CRAFTING_APP_HEIGHT, this.position.height);
        return super.close(options);
    }

    private centerWindow(): void {
        const position = this.position;
        const element = this.element;

        if (!element || element.length === 0) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const width: number = (typeof position.width === 'number' ? position.width : null) || 1000;
        const height: number = (typeof position.height === 'number' ? position.height : null) || 600;

        const left = Math.max(0, (viewportWidth - width) / 2);
        const top = Math.max(0, (viewportHeight - height) / 2);

        this.setPosition({ left, top });
    }

    async getData(options = {}) {
        const data: any = await super.getData(options);

        // Get crafting app data for recipes - this will populate the recipe browser
        const craftingData = await this.craftingApp.getData();
        data.craftingApp = craftingData;

        // Get active crafting projects
        const flag = foundry.utils.getProperty(this.actor, `flags.${Settings.NAMESPACE}.crafting`) || {};
        const unsortedFolders: Array<{
            folder: string;
            [key: string]: any;
        }> = [];

        for(const [x, y] of Object.entries(flag)){
            const craftingData = (y as CraftingData);
            const crafting = new Crafting(craftingData, this.actor);
            let folder = "";
            if(crafting.recipe.folder){
                folder = crafting.recipe.folder;
            }
            this.craftingList[x] = crafting;
            unsortedFolders.push({folder: folder, crafting: crafting, chatData: crafting.getChatData(), id: x});
        }

        data.activeProjects = sortByFolder(unsortedFolders);
        data.hasActiveProjects = unsortedFolders.length > 0;

        return data;
    }

    async _render(force?: boolean, options?: Application.RenderOptions): Promise<void> {
        await super._render(force, options);

        // After the window is rendered, render the initial recipe details
        if (this.element && this.element.length > 0) {
            await this.craftingApp.renderRecipeSheet();
        }

        if (!this._hasBeenCentered) {
            this.centerWindow();
            this._hasBeenCentered = true;
        }
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Set up the crafting app element to point to our recipe browser section
        const browserElement = html.find(".recipe-browser");
        // Override the craftingApp's element property
        (this.craftingApp as any).element = browserElement;

        // Activate crafting app listeners for recipe browsing
        this.craftingApp.activateListeners(browserElement);

        // Active projects listeners (right panel)
        html.find(".removeCrafting").on("click", (e) => {
            const id = e.currentTarget.dataset.id;
            const flags = {};
            flags[`${Settings.NAMESPACE}.crafting.-=${id}`] = null;
            void this.actor.update({flags: flags}).then(() => this.render());
        });

        html.find(".advanceCrafting").on("click", (e) => {
            const id = (e.currentTarget.dataset.id as string);
            void this.craftingList[id].continueCrafting().then(() => {
                this.render();
            });
        });

        html.find(".folderName").on("click", (e) => {
            $(e.currentTarget).parent(".folder").toggleClass(["open", "close"]);
        });
    }
}
