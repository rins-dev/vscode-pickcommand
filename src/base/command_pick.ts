import * as vscode from 'vscode';
import { ExtensionHelper } from '../extension_helper';
import { commandManager } from "./command";
import { CommandContext, ContextHelper, EvalContext } from "./context";
import { CommandError } from './exception';
import { PickCommandOptions } from "./options";


export class PickCommandHelper {
    private static checkOptions(options: {[key: string]: PickCommandOptions}) {
        if (!options) {
            throw new Error("No command configured");
        }
        for (const key in options) {
            if (!options[key].label) {
                options[key].label = key;
            }
        }
    }

    static async canOptionsExecute(options: PickCommandOptions, context: EvalContext) {
        if (await ContextHelper.readOptionWhen(context, options)) {
            await ContextHelper.readOptionKeys(context, options, "label", "description", "detail");
            return true;
        } else {
            return false;
        }
    }

    private static sortOptions(options: {[key: string]: PickCommandOptions}) {
        PickCommandHelper.checkOptions(options);
        const DEFAULT_PRIORITY = 100;
        return Object.values(options).filter(x => (x.priority??DEFAULT_PRIORITY) >= 0)
                      .sort((x, y) => (y.priority??DEFAULT_PRIORITY) - (x.priority??DEFAULT_PRIORITY));
    }

    static async getAllCanExecuteOptions(options: {[key: string]: PickCommandOptions}, context: EvalContext) {
        let optionsCanExecute: PickCommandOptions[] = [];
        for (const option of PickCommandHelper.sortOptions(options)) {
            if (await PickCommandHelper.canOptionsExecute(option, context)) {
                optionsCanExecute.push(option);
            }
        }
        if (optionsCanExecute.length === 0) {
            throw new Error(`No command matches.`);
        }
        return optionsCanExecute;
    }

    static async getFirstCanExecuteOptions(options: {[key: string]: PickCommandOptions}, context: EvalContext) {
        for (const option of PickCommandHelper.sortOptions(options)) {
            if (await PickCommandHelper.canOptionsExecute(option, context)) {
                return option;
            }
        }
        throw new Error(`No command matches.`);
    }

    static async executePickOptions(options: PickCommandOptions[], context: EvalContext) {
        let option = await vscode.window.showQuickPick(options, {
            placeHolder: "Please pick a command to run", 
            matchOnDescription: true, 
            matchOnDetail: true
        });
        if (!option) {
            throw new CommandError();
        }
        ExtensionHelper.log(`Pick command [${option.label}]`);
        return await PickCommandHelper.executeOptions(option, context);
    }

    static async executeOptions(options: PickCommandOptions, context: EvalContext) {
        return await commandManager.executeCommand(options, context);
    }
}