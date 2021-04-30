import * as vscode from 'vscode';
import { InternalCommand } from '../../base/internal';
import { ContextHelper, EvalContext } from '../../base/context';
import { CommandOptions, OptionsHelper, ScriptOptions } from '../../base/options';
import { ExtensionHelper } from '../../extension_helper';
import { ExecOptionsWithBufferEncoding } from 'child_process';
import { CommandError } from '../../base/exception';

export interface RunInChildProcessCommandOptions extends ExecOptionsWithBufferEncoding, CommandOptions, ScriptOptions {
}

class RunInChildProcessCommand extends InternalCommand<RunInChildProcessCommandOptions> {
    
    protected getExcludeKeys(): (keyof RunInChildProcessCommandOptions)[] {
        return ['script'];
    }

    protected async selfExecute(options: RunInChildProcessCommandOptions, context: EvalContext): Promise<unknown> {
        let script: string = await ContextHelper.readOptionValue(context, OptionsHelper.getScriptValue(options));
        ExtensionHelper.log(`[process]$ ${script}`);
        let {stdout, stderr} = await ExtensionHelper.exec(script, options);
        if (stdout) {
            ExtensionHelper.log(`stdout> ${stdout}`);
        }
        if (stderr) {
            ExtensionHelper.log(`stderr> ${stderr}`);
            if (stdout) {
                if (await vscode.window.showErrorMessage(stderr, "Cancel", "Ignore") === "Cancel") {
                    throw new CommandError();
                }
            } else {
                throw new Error(stderr);
            }
        }
        return stdout;
    }
}

export let runInChildProcessCommand = new RunInChildProcessCommand("runInChildProcess");
