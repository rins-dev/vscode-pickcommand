/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { ExtensionHelper } from '../extension_helper';
import { commandManager } from './command';
import { configManager } from './config';
import { CommandOptions, OptionsHelper, ScmResource } from './options';
import { CommandError } from './exception';
import path = require('path');
import fs = require('fs');
import os = require('os');



export interface CommandContext {
    [propName: string]: unknown;
}

export interface EvalContext {
    context: CommandContext;
    args?: CommandContext;
}

let constantContext: CommandContext = {};

export class ContextHelper {

    private static async evalInternal(context: CommandContext, args: CommandContext|undefined, expression: string, original: string) {
        try {
            let result = eval(expression);
            return (result instanceof Promise)? await result: result;
        } catch (err) {
            if (err instanceof CommandError) {
                throw err;
            } else {
                throw new Error(`Evaluate with error:\n${original}\n${(err as Error).message}`);
            }
        }
    }

    private static async evalExpression(evalCtx: EvalContext, expression: string): Promise<unknown> {
        return await ContextHelper.evalInternal(evalCtx.context, evalCtx.args, "(async () => (" + expression + "))()", expression);
    }

    static async evalContext(evalCtx: EvalContext, expression: string): Promise<unknown> {
        return await ContextHelper.evalInternal(evalCtx.context, evalCtx.args, "(async () => {" + expression + "})()", expression);
    }

    static async replaceContext(context: EvalContext, expression: string) {
        let strs: string | string[];
        let result = undefined;
        while (strs = ExtensionHelper.splitBetween(expression, "{{", "}}")) {
            if (typeof strs === 'string') {
                break;
            }
            let [before, value, after] = strs;
            if (value === '') {
                throw new Error(`Evaluate with error:\n${expression}\nEmpty string can not be evaluated.`);
            }

            let valueObject: unknown = await ContextHelper.evalExpression(context, value);
            if (result === undefined) {
                if (before === '' && after === '') {
                    // has only one variable. like "{{xxxxx}}", return the object evaluated
                    return valueObject;
                } else {
                    result = "";
                }
            }
            result += before;
            if (valueObject === undefined) {
                throw new Error(`Evaluate ${value} with undefined.`);
            }
            result += valueObject;
            expression = after;
        }
        return (result??"") + expression;
    }

    static async readOptionValue(context: EvalContext, value: unknown): Promise<any> {
        if (typeof value === 'string') {
            return await ContextHelper.replaceContext(context, value);
        } else if (OptionsHelper.isCommandOptions(value)) {
            if (await ContextHelper.readOptionWhen(context, value)) {
                return await commandManager.executeCommand(value, context);
            } else {
                return undefined;
            }
        } else if (typeof value === 'object') {
            if (value instanceof Array) {
                for (let i=0; i<value.length; i++) {
                    value[i] = await ContextHelper.readOptionValue(context, value[i]);
                }
            } else {
                for (const key in value) {
                    (value as any)[key] = await ContextHelper.readOptionValue(context, (value as any)[key]);
                }
            }
            return value;
        } else {
            return value;
        }
    }

    static async readOptionKeys<T>(context: EvalContext, options: T, ...keys: (keyof T)[]): Promise<T> {
        for (const key of keys) {
            if (options[key] !== undefined) {
                options[key] = await ContextHelper.readOptionValue(context, options[key]);
            }
        }
        return options;
    }

    static async readOptionsExcludeKeys<T>(context: EvalContext, options: T, ...keys: (keyof T)[]): Promise<T> {
        for (const key in options) {
            if (!keys.includes(key)) {
                options[key] = await ContextHelper.readOptionValue(context, options[key]);
            }
        }
        return options;
    }


    static async readOptionWhen(context: EvalContext, options: CommandOptions) {
        if (options.when === undefined) {
            options.when = true;
        } else {
            if (await ContextHelper.readOptionValue(context, options.when)) {
                options.when = true;
            } else {
                options.when = false;
            }
        }
        return options.when;
    }

    private static compareString(x: string, y: string): number {
        const SORT_CHARS = "_0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (x.length === 0 && y.length === 0) {
            return 0;
        }
        if (x.length === 0) {
            return -1;
        }
        if (y.length === 0) {
            return 1;
        }
        if (x[0] === y[0]) {
            return ContextHelper.compareString(x.slice(1), y.slice(1));
        }
        let xi = SORT_CHARS.indexOf(x[0]);
        let yi = SORT_CHARS.indexOf(y[0]);
        if (xi < 0 && yi < 0) {
            return x.localeCompare(y);
        }
        if (xi < 0) {
            return 1;
        }
        if (yi < 0) {
            return -1;
        }
        return xi - yi;
    }

    static async readOptionContext(context: EvalContext, contextOptions?: {[key: string]: unknown}) : Promise<void> {
        if (contextOptions) {
            for (const key of Object.keys(contextOptions).sort(ContextHelper.compareString)) {
                context.context[key] = await ContextHelper.readOptionValue(context, contextOptions[key]);
                ExtensionHelper.trace(`Context: ${key}`, context.context[key]);
            }
        }
    }


    private static getUriResource(uris: unknown[]): vscode.Uri[]|undefined {
        if (uris.some(x => !(x instanceof vscode.Uri))) {
            return undefined;
        }
        return uris as vscode.Uri[];
    }

    private static isUriArray(value: unknown): value is vscode.Uri[] {
        return !(value instanceof Array) || value.some(x => !(x instanceof vscode.Uri));
    }

    static async createContext(args: unknown[]) {
        let context: CommandContext = Object.assign({}, constantContext);

        let evalCtx: EvalContext = {context};
        
        context.CURRENT_ARGUMENTS = args;
        context.SELECTED_FILE = undefined;
        context.SELECTED_FILES = undefined;

        ExtensionHelper.trace(`Context: CURRENT_ARGUMENTS`, context.CURRENT_ARGUMENTS);
        
        if (args.length > 0) {
            if (args[0] instanceof vscode.Uri) {
                // USED for explorer/context & editor/title/context
                context.SELECTED_FILE = args[0];
                ExtensionHelper.trace(`Context: SELECTED_FILE`, context.SELECTED_FILE);
    
                // USED for explorer/context
                if (args.length > 1 && ContextHelper.isUriArray(args[1])) {
                    context.SELECTED_FILES = args[1];
                    ExtensionHelper.trace(`Context: SELECTED_FILES`, context.SELECTED_FILES);
                }
            } else if (OptionsHelper.isScmResource(args[0])) {
                // USED for scm/resourceState/context & scm/resourceFolder/context
                context.SELECTED_FILE = args[0].resourceUri;
                ExtensionHelper.trace(`Context: SELECTED_FILE`, context.SELECTED_FILE);
                let uris = args.map(x => (x as ScmResource).resourceUri);
                if (ContextHelper.isUriArray(uris)) {
                    context.SELECTED_FILES = uris;
                    ExtensionHelper.trace(`Context: SELECTED_FILES`, context.SELECTED_FILES);
                }
            }
        }

        await ContextHelper.readOptionContext(evalCtx, configManager.getCommandContext());
        return evalCtx;
    }
    
    static async reloadConstantContext() {
        let context: any = {};
        context.CURRENT_PLATFORM = os.platform();
 
        context.log = (x: any): void => ExtensionHelper.log(x);
        context.cancel = (message?: string): never => { throw new CommandError(message); };
        context.defined = <T>(x: T, message?: string): never | T => {
            if (x === undefined) { return context.cancel(message); } else { return x; }
        };
        
        context.asUri = (x: vscode.Uri|string): vscode.Uri => x instanceof vscode.Uri ? x: vscode.Uri.file(x);
        context.asPath = (x: vscode.Uri|string): string => x instanceof vscode.Uri ? x.fsPath: x;

        context.basename = (x: vscode.Uri|string): string => path.basename(context.asPath(x));
        context.dirname = (x: vscode.Uri|string): string => path.dirname(context.asPath(x));
        context.fileExists = (x: vscode.Uri|string): boolean => fs.existsSync(context.asPath(x));
        context.filetype = async (x: vscode.Uri|string): Promise<"DIRECTORY" | "FILE" | undefined> => {
            try {
                let stat = await vscode.workspace.fs.stat(context.asUri(x)); 
                if (stat.type & vscode.FileType.Directory) { return 'DIRECTORY';}
                else if (stat.type & vscode.FileType.File) { return 'FILE'; } 
                else { return undefined; } 
            } catch (err) { 
                return undefined; 
            }
        };

        context.showInputBox = async (options?: vscode.InputBoxOptions): Promise<string> => context.defined(await vscode.window.showInputBox(options));
        context.showQuickPick = async (items: vscode.QuickPickItem[], options?: vscode.QuickPickOptions) => context.defined(await vscode.window.showQuickPick(items, options));
        
        context.openExternal = async (x: vscode.Uri|string): Promise<boolean> => vscode.env.openExternal(context.asUri(x));
        context.showTextDocument = async (doc: vscode.TextDocument | Promise<vscode.TextDocument>, language?: string): Promise<vscode.TextEditor> => {
            if (doc instanceof Promise) { doc = await doc; }
            if (language !== undefined) { doc = await vscode.languages.setTextDocumentLanguage(doc, language); }
            return vscode.window.showTextDocument(doc);
        };
        context.openInternal = async (x: vscode.Uri|string, language?: string): Promise<vscode.TextEditor> => {
            return context.showTextDocument(vscode.workspace.openTextDocument(context.asUri(x)), language);
        };
        context.openTextEditor = async (content: string, language?: string): Promise<vscode.TextEditor> => {
            return context.showTextDocument(vscode.workspace.openTextDocument({content}), language);
        };

        let configContext = configManager.getConstantContext();
        if (configContext) {
            for (const key of Object.keys(configContext).sort(ContextHelper.compareString)) {
                context[key] = await ContextHelper.readOptionValue({context}, configContext[key]);
                ExtensionHelper.trace(`Constant context: ${key}`, context[key]);
            }
        }
        constantContext = context;
    }
}
