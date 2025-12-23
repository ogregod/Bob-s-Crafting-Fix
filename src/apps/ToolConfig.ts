import {Settings} from "../Settings.js";

export class ToolConfig extends FormApplication {
    tools: any[];

    constructor(options = {}) {
        super(options);
        this.tools = Settings.get(Settings.TOOL_CONFIG) || [];
    }

    static get defaultOptions(): any {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: "Tool Configuration",
            id: "tool-config",
            template: "modules/bobs-crafting-guide/templates/tool-config.hbs",
            width: 600,
            height: "auto",
            closeOnSubmit: true,
            submitOnClose: false,
            resizable: true
        });
    }

    async getData(options = {}) {
        const data = await super.getData(options);
        return foundry.utils.mergeObject(data, {
            tools: this.tools,
            // @ts-ignore
            abilities: CONFIG.DND5E?.abilities || {}
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Add tool button
        html.find('.add-tool').on('click', () => {
            this.tools.push({
                name: "New Tool",
                ability: "dex",
                itemUuid: ""
            });
            this.render();
        });

        // Delete tool button
        html.find('.delete-tool').on('click', (e) => {
            const index = parseInt($(e.currentTarget).data('index'));
            this.tools.splice(index, 1);
            this.render();
        });

        // Handle item drops
        this._setupDragDrop(html);
    }

    _setupDragDrop(html) {
        const dropAreas = html.find('.tool-item-drop');
        dropAreas.on('drop', async (event) => {
            event.preventDefault();
            const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));

            if (data.type === 'Item') {
                const item = await fromUuid(data.uuid);
                if (item) {
                    const index = parseInt($(event.currentTarget).data('index'));
                    this.tools[index].name = item.name;
                    this.tools[index].itemUuid = data.uuid;
                    this.render();
                }
            }
        });

        dropAreas.on('dragover', (event) => {
            event.preventDefault();
        });
    }

    async _updateObject(event, formData) {
        // Update tool names and abilities from form
        const expanded = foundry.utils.expandObject(formData);

        if (expanded.tools) {
            this.tools.forEach((tool, index) => {
                if (expanded.tools[index]) {
                    tool.name = expanded.tools[index].name || tool.name;
                    tool.ability = expanded.tools[index].ability || tool.ability;
                }
            });
        }

        // Save to settings
        await Settings.set(Settings.TOOL_CONFIG, this.tools);

        ui.notifications?.info("Tool configuration saved!");
    }
}
