
import { ExtensionHelper } from "../extension_helper";
import { ContextHelper, CommandContext, EvalContext } from "./context";
import { CommandOptions } from "./options";


export abstract class InternalCommand<T extends CommandOptions> {
    readonly command: string;

    constructor(command: string) {
        this.command = ExtensionHelper.appendExtensionName(command);
    }

    protected abstract getExcludeKeys(): string[];

    async executeInternal(options: T, context: EvalContext): Promise<unknown> {
        await ContextHelper.readOptionContext(context, options.context);

        let excludeKeys = Object.assign(["when", "command", "context"], this.getExcludeKeys()) as (keyof T)[];
        await ContextHelper.readOptionsExcludeKeys(context, options, ...excludeKeys);
        
        return await this.selfExecute(options, context);
    }

    protected abstract selfExecute(options: T, context: EvalContext): Promise<unknown>;
}

