import * as vscode from 'vscode';
import { InternalCommand } from '../../base/internal';
import { ContextHelper, EvalContext } from '../../base/context';
import { CommandOptions, OptionsHelper, ScriptOptions } from '../../base/options';

export interface RunInJsCommandOptions extends CommandOptions, ScriptOptions {
}

class RunInJsCommand extends InternalCommand<RunInJsCommandOptions> {

    protected getExcludeKeys(): (keyof RunInJsCommandOptions)[] {
        return ['script'];
    }

    protected async selfExecute(options: RunInJsCommandOptions, context: EvalContext): Promise<unknown> {
        let script = OptionsHelper.getScriptValue(options);
        return await ContextHelper.evalContext(context, script);
    }
}

export let runInJsCommand = new RunInJsCommand("runInJs");
