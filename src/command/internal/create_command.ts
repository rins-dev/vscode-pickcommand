import { InternalCommand } from '../../base/internal';
import { CommandContext, EvalContext } from '../../base/context';
import { CommandOptions } from '../../base/options';
import { ExtensionHelper } from '../../extension_helper';
import { commandManager } from '../../base/command';

interface CreateCommandOptions extends CommandOptions {
    value: CommandOptions;
    args: string[];
}

class CallableCommand {
    value: CommandOptions;
    args: string[];
    context: CommandContext;

    constructor(value: CommandOptions, args: string[], context: CommandContext) {
        this.value = value;
        this.args = args;
        this.context = context;
    }

    public async execute(...args:any[]): Promise<unknown>  {
        let cmdArgs: CommandContext = {};
        if (this.args) {
            for (let i=0; i<this.args.length; i++) {
                cmdArgs[this.args[i]] = args[i];
            }
        }
        return await commandManager.executeCommand(ExtensionHelper.clone(this.value), {context: this.context, args: cmdArgs});
    }
}

class CreateCommand extends InternalCommand<CreateCommandOptions> {

    protected getExcludeKeys(): (keyof CreateCommandOptions)[] {
        return ["value", "args"];
    }

    protected async selfExecute(options: CreateCommandOptions, context: EvalContext): Promise<unknown> {
        return new CallableCommand(ExtensionHelper.clone(options.value), options.args, context.context);
    }

    
}

export let createCommand = new CreateCommand("createCommand");