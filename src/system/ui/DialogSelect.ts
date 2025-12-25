/**
 * Dialog Selection UI
 * Provides a selection dialog for choosing between options
 * Replaces beaversSystemInterface.uiDialogSelect()
 */

export interface SelectOptions {
    choices: {
        [key: string]: {
            text: string;
            img?: string;
        }
    };
    title?: string;
}

/**
 * Show a selection dialog to the user
 */
export class DialogSelect {
    /**
     * Show a selection dialog
     * @param options Dialog configuration
     * @returns Selected choice key
     */
    static async show(options: SelectOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            // Create content with a grid of clickable items
            const items = Object.entries(options.choices).map(([id, choice]) => {
                const imgSrc = choice.img || "icons/svg/item-bag.svg";
                return `
                    <div class="dialog-select-item" data-choice-id="${id}" style="
                        display: inline-block;
                        width: 120px;
                        margin: 8px;
                        padding: 12px;
                        border: 2px solid var(--beavers-item-border-color, #999);
                        border-radius: 8px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.2s;
                        background: var(--beavers-item-background-color, #f5f5f5);
                        vertical-align: top;
                    " onmouseover="this.style.transform='scale(1.05)'; this.style.borderColor='var(--color-border-highlight-alt, #4CAF50)';"
                       onmouseout="this.style.transform='scale(1)'; this.style.borderColor='var(--beavers-item-border-color, #999)';">
                        <img src="${imgSrc}" style="
                            width: 64px;
                            height: 64px;
                            object-fit: contain;
                            margin-bottom: 8px;
                            border-radius: 4px;
                            background: rgba(0, 0, 0, 0.05);
                            padding: 4px;
                        "/>
                        <div style="
                            font-size: 13px;
                            font-weight: 600;
                            word-wrap: break-word;
                            line-height: 1.3;
                            color: var(--color-text-dark-primary, #333);
                        ">${choice.text}</div>
                    </div>
                `;
            }).join('');

            const content = `
                <div style="padding: 10px;">
                    <p style="margin-bottom: 16px; font-size: 14px;">Select an item:</p>
                    <div class="dialog-select-grid" style="
                        max-height: 500px;
                        overflow-y: auto;
                        text-align: center;
                        padding: 8px;
                    ">
                        ${items}
                    </div>
                </div>
            `;

            // Create the dialog
            let dialog: any;
            dialog = new Dialog({
                title: options.title || "Select an Option",
                content: content,
                buttons: {
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => reject(new Error("Dialog cancelled"))
                    }
                },
                default: "cancel",
                close: () => reject(new Error("Dialog closed without selection")),
                render: (html: any) => {
                    // Add click handlers to items
                    $(html).find('.dialog-select-item').on('click', function() {
                        const choiceId = $(this).data('choice-id');
                        dialog.close();
                        resolve(choiceId);
                    });
                }
            }, {
                width: 600,
                height: "auto",
                classes: ["dialog", "beavers-select-dialog"]
            }).render(true);
        });
    }

    /**
     * Show a simple confirmation dialog
     * @param title Dialog title
     * @param content Dialog content
     * @returns True if confirmed, false if cancelled
     */
    static async confirm(title: string, content: string): Promise<boolean> {
        return new Promise((resolve) => {
            new Dialog({
                title: title,
                content: content,
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Yes",
                        callback: () => resolve(true)
                    },
                    no: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "No",
                        callback: () => resolve(false)
                    }
                },
                default: "yes",
                close: () => resolve(false)
            }).render(true);
        });
    }
}
