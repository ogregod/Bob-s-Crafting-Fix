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
            const buttons: any = {};

            // Create a button for each choice
            for (const [id, choice] of Object.entries(options.choices)) {
                buttons[id] = {
                    label: choice.text,
                    icon: choice.img ? `<img src="${choice.img}" width="20" height="20" style="vertical-align: middle; margin-right: 5px;">` : "",
                    callback: () => resolve(id)
                };
            }

            // Create the dialog
            new Dialog({
                title: options.title || "Select an Option",
                content: "<p>Please select an option:</p>",
                buttons: buttons,
                default: Object.keys(options.choices)[0],
                close: () => reject(new Error("Dialog closed without selection"))
            }, {
                width: 400
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
