import { ContextHelper } from '../base/context';
import { configManager } from '../base/config';
import { PickCommandHelper } from '../base/command_pick';


export class PickShortcutCommand {
    static readonly command: string = "shortcut";

    static async execute(command: string): Promise<unknown> {
        let context = await ContextHelper.createContext([]);
        let options = configManager.getShortcutCommand(command);
        if (await PickCommandHelper.canOptionsExecute(options, context)) {
            return await PickCommandHelper.executeOptions(options, context);
        }
        throw new Error(`Command [${options.label}] does not match.`);
    }
}

