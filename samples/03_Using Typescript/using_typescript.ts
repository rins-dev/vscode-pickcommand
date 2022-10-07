import * as vscode from "vscode";
import * as path from "path";
import { createContext } from "./context";

let context: ReturnType<typeof createContext>;

export function init(...args: unknown[]) {
    context = createContext(...args);
}

export function when(...args: unknown[]) {
    if (context.SELECTED_FILE === undefined) return false;
    if (context.SELECTED_FILE.fsPath.endsWith(`.js`)) return false;
    return true;
}

export const label = () => `Open ${path.basename(context.SELECTED_FILE!.fsPath)}`;

export function pickcommand() {
    vscode.window.showInformationMessage(context.SELECTED_FILE!.fsPath);
}

// 1. npm init -y & npm install @types/node & npm install @types/vscode
// 2. using tsc *.ts to compile ts file to js
