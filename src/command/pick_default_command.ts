

import { PickCommandHelper } from "../base/command_pick";
import { configManager } from "../base/config";
import { ContextHelper } from "../base/context";

export class PickDefaultCommand {
    static readonly command: string = "pickDefaultCommand";

    static async execute(...args: unknown[]): Promise<unknown> {
        let context = await ContextHelper.createContext(args);
        let option = await PickCommandHelper.getFirstCanExecuteOptions(configManager.getCommands(), context);
        return await PickCommandHelper.executeOptions(option, context);
    }

}
