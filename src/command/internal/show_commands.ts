import * as vscode from 'vscode';
import { InternalCommand } from '../../base/internal';
import { EvalContext } from '../../base/context';
import { CommandOptions, PickCommandOptions } from '../../base/options';
import { PickCommandHelper } from '../../base/command_pick';

interface ShowCommandsOptions extends CommandOptions  {
    commands: {[key: string]: PickCommandOptions};
}

class ShowCommands extends InternalCommand<ShowCommandsOptions> {
    protected getExcludeKeys(): (keyof ShowCommandsOptions)[] {
        return ['commands'];
    }
    protected async selfExecute(options: ShowCommandsOptions, context: EvalContext): Promise<unknown> {
        let subOptions = await PickCommandHelper.getAllCanExecuteOptions(options.commands, context);
        return await PickCommandHelper.executePickOptions(subOptions, context);
    }
}

export let showCommands = new ShowCommands("showCommands");