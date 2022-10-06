import * as vscode from "vscode";

export function createContext(...args: unknown[]) {
    let context: {
        CURRENT_ARGUMENTS: unknown[],
        SELECTED_FILE?: vscode.Uri,
        SELECTED_FILES?: vscode.Uri[]
    } = {
        CURRENT_ARGUMENTS: args
    };
    if (args.length > 0) {
        if (args[0] instanceof vscode.Uri) {
            if (args.length > 1 && Array.isArray(args[1]) && args[1].every(x => x instanceof vscode.Uri)) {
                // USED for explorer/context
                context.SELECTED_FILE = args[0];
                context.SELECTED_FILES = args[1];
            } else {
                // USED for editor/title/context
                context.SELECTED_FILE = args[0];
                context.SELECTED_FILES = [context.SELECTED_FILE];
            }
        } else if (args.every(x => (x as vscode.SourceControlResourceState).resourceUri instanceof vscode.Uri)) {
            // USED for scm/resourceState/context & scm/resourceFolder/context
            context.SELECTED_FILES = args.map(x => (x as vscode.SourceControlResourceState).resourceUri);
            context.SELECTED_FILE = context.SELECTED_FILES[0];
        }
    }
    // console.log(ctx);
    return context;
}