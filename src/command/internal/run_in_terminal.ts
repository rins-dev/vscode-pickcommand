import * as vscode from 'vscode';
import { InternalCommand } from '../../base/internal';
import { ContextHelper, EvalContext } from '../../base/context';
import { CommandOptions, OptionsHelper, ScriptOptions } from '../../base/options';
import { ExtensionHelper } from '../../extension_helper';

export interface RunInTerminalCommandOptions extends CommandOptions, ScriptOptions {
    terminal?: vscode.Terminal;
}

class RunInTerminalCommand extends InternalCommand<RunInTerminalCommandOptions> {

    protected getExcludeKeys(): (keyof RunInTerminalCommandOptions)[] {
        return ['script'];
    }
    
    protected async selfExecute(options: RunInTerminalCommandOptions, context: EvalContext): Promise<unknown> {
        let script: string = await ContextHelper.readOptionValue(context, OptionsHelper.getScriptValue(options));
        let terminal = options.terminal??vscode.window.activeTerminal;
        if (terminal === undefined) {
            throw new Error(`No active terminal found.`);
        }
        terminal.show();
        if (!vscode.window.terminals.includes(terminal)) {
            throw new Error(`The specified terminal is no longer exists.`);
        }
        terminal.sendText(script);
        return terminal;
    }
}

export let runInTerminalCommand = new RunInTerminalCommand("runInTerminal");
