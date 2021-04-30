import * as vscode from 'vscode';
import { ContextHelper } from '../base/context';
import { configManager } from '../base/config';
import { PickCommandHelper } from '../base/command_pick';


export class PickAllCommand {
    static readonly command: string = "pickAllCommand";

    static async execute(...args: unknown[]): Promise<unknown> {
        let context = await ContextHelper.createContext(args);
        let options = await PickCommandHelper.getAllCanExecuteOptions(configManager.getCommands(), context);
        return await PickCommandHelper.executePickOptions(options, context);
    }
}

