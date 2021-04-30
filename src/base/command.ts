import * as vscode from 'vscode';
import { ExtensionHelper } from "../extension_helper";
import { EvalContext } from "./context";
import { CommandOptions } from './options';
import { InternalCommand } from './internal';


import { runInTerminalCommand } from '../command/internal/run_in_terminal';
import { showCommands } from '../command/internal/show_commands';
import { runInJsCommand } from '../command/internal/run_in_js';
import { runInChildProcessCommand } from '../command/internal/run_in_child_process';
import { PickAllCommand } from '../command/pick_all_command';
import { PickDefaultCommand } from '../command/pick_default_command';
import { createCommand } from '../command/internal/create_command';
import { PickShortcutCommand } from '../command/pick_shortcut_command';



class CommandManager {

    private internalCommands: InternalCommand<CommandOptions>[] = [
        runInJsCommand,
        runInChildProcessCommand,
        runInTerminalCommand,
        showCommands,
        createCommand
    ];
    
    init() {
        ExtensionHelper.registerCommand(ExtensionHelper.appendExtensionName(PickAllCommand.command), PickAllCommand.execute);
        ExtensionHelper.registerCommand(ExtensionHelper.appendExtensionName(PickDefaultCommand.command), PickDefaultCommand.execute);
        for (let index = 1; index < 10; index++) {
            let command = `${PickShortcutCommand.command}${index}`;
            ExtensionHelper.registerCommand(ExtensionHelper.appendExtensionName(command), 
                async() => PickShortcutCommand.execute(command));
        }
    }

    async executeCommand(options: CommandOptions, context: EvalContext) {
        let command = commandManager.internalCommands.find(x => x.command === options.command);
        if (command) {
            return await command.executeInternal(options, context);
        } else {
            return await vscode.commands.executeCommand(options.command);
        }
    }
}

export let commandManager = new CommandManager();




