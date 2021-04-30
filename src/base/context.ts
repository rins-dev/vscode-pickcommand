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
                throw new Error(`Evaluate with error:\n${original}\n${err.message}`);
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
        for (const uri of uris) {
            if (!(uri instanceof vscode.Uri)) {
                return undefined;
            }
        }
        return uris as vscode.Uri[];
    }


    static async createContext(args: unknown[]) {
        let context: CommandContext = Object.assign({}, constantContext);

        let evalCtx: EvalContext = {context};
        

        context.CURRENT_ARGUMENTS = args;
        
         // USED for explorer/context & editor/title/context
        if (args.length > 0 && args[0] instanceof vscode.Uri) {
            context.SELECTED_FILE = args[0];
        }
        // USED for explorer/context
        if (args.length > 1 && args[1] instanceof Array) {
            context.SELECTED_FILES = ContextHelper.getUriResource(args[1]);
        }
        // USED for scm/resourceState/context & scm/resourceFolder/context
        if (args.length > 0 && OptionsHelper.isScmResource(args[0])) {
            context.SELECTED_FILE = args[0].resourceUri;
            context.SELECTED_FILES = ContextHelper.getUriResource(args.map(x => (x as ScmResource).resourceUri));
        }

        await ContextHelper.readOptionContext(evalCtx, configManager.getCommandContext());
        return evalCtx;
    }
    
    static async reloadConstantContext() {
        let context: CommandContext = {};
        context.CURRENT_PLATFORM = os.platform();
 
        context.log = (x: any) => ExtensionHelper.log(x);
        context.cancel = (message?: string) => { throw new CommandError(message); };
        context.defined = (x: any, message?: string) => {
            if (x === undefined) {
                (context as any).cancel(message);
            }
            return x;
        };
        context.basename = (x: vscode.Uri|string) => path.basename(x instanceof vscode.Uri ? x.fsPath: x);
        context.dirname = (x: vscode.Uri|string) => path.dirname(x instanceof vscode.Uri ? x.fsPath: x);
        context.fileExists = (x: vscode.Uri|string) => fs.existsSync(x instanceof vscode.Uri ? x.fsPath: x);
        context.filetype = async (x: vscode.Uri|string) => {
            try {
                let stat = await vscode.workspace.fs.stat(x instanceof vscode.Uri ? x : vscode.Uri.file(x)); 
                if (stat.type & vscode.FileType.Directory) { return 'DIRECTORY';}
                else if (stat.type & vscode.FileType.File) { return 'FILE'; } 
                else { return undefined; } 
            } catch (err) { 
                return undefined; 
            }
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
