/**
 * Sheet Integration Helpers
 * Handles integration with Foundry actor and item sheets
 * Supports both Application V1 and V2 (Foundry V13+)
 */

export interface TabConfig {
    id: string;
    label: string;
    html: string;  // Icon HTML
}

/**
 * Sheet integration utilities
 */
export class SheetIntegration {
    /**
     * Add a tab to an actor sheet
     * Automatically detects ApplicationV1 vs ApplicationV2
     * @param app The sheet application
     * @param html The sheet HTML
     * @param actor The actor
     * @param tabConfig Tab configuration
     * @param content Tab content (HTML or jQuery)
     */
    static addTab(app: any, html: any, actor: Actor, tabConfig: TabConfig, content: any): void {
        // Detect application version
        // @ts-ignore
        if (app.constructor.name.includes("ApplicationV2") || foundry.applications?.api?.ApplicationV2 && app instanceof foundry.applications.api.ApplicationV2) {
            this.addTabV2(app, html, actor, tabConfig, content);
        } else {
            this.addTabV1(app, html, actor, tabConfig, content);
        }
    }

    /**
     * Add tab to ApplicationV1 sheet (legacy)
     * @param app The sheet application
     * @param html The sheet HTML (jQuery)
     * @param actor The actor
     * @param tabConfig Tab configuration
     * @param content Tab content
     */
    private static addTabV1(app: any, html: JQuery, actor: Actor, tabConfig: TabConfig, content: any): void {
        // Find tabs navigation
        const nav = html.find('nav.sheet-tabs, nav.tabs');
        if (!nav.length) {
            console.warn("Could not find tabs navigation for actor sheet");
            return;
        }

        // Check if tab already exists
        const existingTabButton = nav.find(`a[data-tab="${tabConfig.id}"]`);
        const existingTabContent = html.find(`.tab[data-tab="${tabConfig.id}"]`);

        // If tab doesn't exist, create it
        if (!existingTabButton.length) {
            // Add tab button
            const tabButton = `<a class="item" data-tab="${tabConfig.id}">${tabConfig.html} ${tabConfig.label}</a>`;
            nav.append(tabButton);
        }

        // Find sheet body
        const body = html.find('.sheet-body, .window-content');
        if (!body.length) {
            console.warn("Could not find sheet body for actor sheet");
            return;
        }

        let tabContent: JQuery;
        if (existingTabContent.length) {
            // Tab exists, just update content
            tabContent = existingTabContent;
            tabContent.empty();
        } else {
            // Create new tab content container with scrollable wrapper
            tabContent = $(`<div class="tab" data-group="primary" data-tab="${tabConfig.id}" style="max-height: 600px; overflow-y: auto; overflow-x: hidden; padding: 10px;"></div>`);
            body.append(tabContent);
        }

        // Add content to tab
        if (content instanceof jQuery) {
            tabContent.append(content as any);
        } else if (typeof content === 'string') {
            tabContent.html(content);
        } else {
            tabContent.append($(content));
        }
    }

    /**
     * Add tab to ApplicationV2 sheet (Foundry V13+)
     * @param app The sheet application
     * @param html The sheet HTML (native element)
     * @param actor The actor
     * @param tabConfig Tab configuration
     * @param content Tab content
     */
    private static addTabV2(app: any, html: any, actor: Actor, tabConfig: TabConfig, content: any): void {
        // ApplicationV2 uses different structure
        const element = html instanceof jQuery ? html[0] : html;

        // Find tabs navigation
        const tabsElement = element.querySelector('nav[data-group="primary"], nav.tabs');
        if (!tabsElement) {
            console.warn("Could not find tabs navigation for ApplicationV2 sheet");
            return;
        }

        // Check if tab button already exists
        const existingTabButton = tabsElement.querySelector(`button[data-tab="${tabConfig.id}"]`);

        if (!existingTabButton) {
            // Create tab button
            const tabButton = document.createElement('button');
            tabButton.type = 'button';
            tabButton.className = 'item';
            tabButton.dataset.tab = tabConfig.id;
            tabButton.dataset.group = 'primary';
            tabButton.innerHTML = `${tabConfig.html} ${tabConfig.label}`;

            tabsElement.appendChild(tabButton);
        }

        // Find content area
        const contentArea = element.querySelector('.window-content, .sheet-body');
        if (!contentArea) {
            console.warn("Could not find content area for ApplicationV2 sheet");
            return;
        }

        // Check if tab content already exists
        let tabContent = contentArea.querySelector(`section[data-tab="${tabConfig.id}"]`) as HTMLElement;

        if (tabContent) {
            // Tab exists, just update content
            tabContent.innerHTML = '';
        } else {
            // Create tab content section with scrollable wrapper
            tabContent = document.createElement('section');
            tabContent.className = 'tab';
            tabContent.dataset.tab = tabConfig.id;
            tabContent.dataset.group = 'primary';
            tabContent.style.maxHeight = '600px';
            tabContent.style.overflowY = 'auto';
            tabContent.style.overflowX = 'hidden';
            tabContent.style.padding = '10px';

            contentArea.appendChild(tabContent);
        }

        // Add content
        if (content instanceof jQuery) {
            tabContent.appendChild(content[0]);
        } else if (typeof content === 'string') {
            tabContent.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            tabContent.appendChild(content);
        } else {
            tabContent.appendChild(content);
        }
    }

    /**
     * Replace content in an item sheet
     * @param app The sheet application
     * @param html The sheet HTML
     * @param newContent The new content to insert (jQuery element or HTML string)
     */
    static replaceContent(app: any, html: any, newContent: any): void {
        const $html = (html instanceof jQuery ? html : $(html)) as JQuery;

        // Find the main content area to replace
        // Try multiple selectors for different sheet versions
        let $contentArea = $html.find('.sheet-body');
        if ($contentArea.length === 0) {
            $contentArea = $html.find('.window-content');
        }
        if ($contentArea.length === 0) {
            $contentArea = $html.find('form.editable, form');
        }

        if ($contentArea.length === 0) {
            console.warn("Could not find content area to replace in item sheet");
            return;
        }

        // Clear existing content and add new content
        $contentArea.empty();
        $contentArea.append(newContent);
    }

    /**
     * Check if an application is ApplicationV2
     * @param app The application
     * @returns True if V2
     */
    static isApplicationV2(app: any): boolean {
        // @ts-ignore
        return app.constructor.name.includes("ApplicationV2") || (foundry.applications?.api?.ApplicationV2 && app instanceof foundry.applications.api.ApplicationV2);
    }
}
