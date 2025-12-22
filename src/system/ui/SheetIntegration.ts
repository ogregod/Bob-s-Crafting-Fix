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

        // Add tab button
        const tabButton = `<a class="item" data-tab="${tabConfig.id}">${tabConfig.html} ${tabConfig.label}</a>`;
        nav.append(tabButton);

        // Find sheet body
        const body = html.find('.sheet-body, .window-content');
        if (!body.length) {
            console.warn("Could not find sheet body for actor sheet");
            return;
        }

        // Add tab content container
        const tabContent = $(`<div class="tab" data-group="primary" data-tab="${tabConfig.id}"></div>`);
        body.append(tabContent);

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

        // Create tab button
        const tabButton = document.createElement('button');
        tabButton.type = 'button';
        tabButton.className = 'item';
        tabButton.dataset.tab = tabConfig.id;
        tabButton.dataset.group = 'primary';
        tabButton.innerHTML = `${tabConfig.html} ${tabConfig.label}`;

        tabsElement.appendChild(tabButton);

        // Find content area
        const contentArea = element.querySelector('.window-content, .sheet-body');
        if (!contentArea) {
            console.warn("Could not find content area for ApplicationV2 sheet");
            return;
        }

        // Create tab content section
        const tabContent = document.createElement('section');
        tabContent.className = 'tab';
        tabContent.dataset.tab = tabConfig.id;
        tabContent.dataset.group = 'primary';

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

        contentArea.appendChild(tabContent);
    }

    /**
     * Replace content in an item sheet
     * @param app The sheet application
     * @param html The sheet HTML
     * @param element Selector or element to replace
     */
    static replaceContent(app: any, html: any, element: string | HTMLElement): void {
        const htmlElement = html instanceof jQuery ? html[0] : html;

        let targetElement: HTMLElement | null = null;
        if (typeof element === 'string') {
            targetElement = htmlElement.querySelector(element);
        } else {
            targetElement = element;
        }

        if (!targetElement) {
            console.warn("Could not find element to replace in item sheet");
            return;
        }

        // Replace is handled by the caller providing the new content
        // This is a placeholder for compatibility
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
