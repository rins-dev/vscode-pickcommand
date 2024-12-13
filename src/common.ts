import * as vscode from 'vscode';
import { Converter, RFunction } from './converters';

export interface VSCMessage {
    info(message: string, btns?: { [label: string]: RFunction }): void;
    warn(message: string, btns?: { [label: string]: RFunction }): void;
    error(message: string, btns?: { [label: string]: RFunction }): void;
}

export class VSC {
    _context: vscode.ExtensionContext;

    private _logger?: vscode.LogOutputChannel;

    get logger() {
        if (this._logger === undefined) {
            this._logger = vscode.window.createOutputChannel(this.displayName, { log: true});
        }
        return this._logger;
    }

    private _message?: VSCMessage;

    get message() {
        if (this._message === undefined) {
            async function showMessage(showMessage: typeof vscode.window.showInformationMessage, message: string, btns?: { [label: string]: RFunction }) {
                const items = Object.keys(btns ?? {});
                const result = await showMessage(message, ...items);
                if (result !== undefined && btns !== undefined) return btns[result]();
            }

            this._message = {
                info: (message, btns) => showMessage(vscode.window.showInformationMessage, message, btns),
                warn: (message, btns) => showMessage(vscode.window.showWarningMessage, message, btns),
                error: (message, btns) => showMessage(vscode.window.showErrorMessage, message, btns),
            };
        }
        return this._message;
    }

    get displayName() {
        return this._context.extension.packageJSON.displayName;
    }

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }

    registerCommand(command: string, callback: (...args: any[]) => any) {
        this._context.subscriptions.push(vscode.commands.registerCommand(command ,callback));
    }
}
