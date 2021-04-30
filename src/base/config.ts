import * as vscode from 'vscode';
import { ExtensionHelper } from '../extension_helper';
import { ContextHelper } from './context';
import { PickCommandOptions } from './options';


class ConfigManager {
    private constantContext: {[key: string]: any} = {};
    private context: {[key: string]: any} = {};
    private commands: {[key: string]: PickCommandOptions} = {};

    async init() {
        ExtensionHelper.registerConfigurationChangedEvent(ConfigManager.onConfigChanged);

        await this.loadConstantContext();
        await this.loadContext();
        await this.loadCommandsConfig();
    }

    getConstantContext() {
        return ExtensionHelper.clone(this.constantContext);
    }

    getCommandContext() {
        return ExtensionHelper.clone(this.context);
    }

    getCommands() {
        return ExtensionHelper.clone(this.commands);
    }

    getCommand(key: string) {
        let command = this.commands[key];
        if (!command) {
            throw new Error(`Command [${key}] is not found.`);
        }
        return ExtensionHelper.clone(command);
    }

    getShortcutCommand(command: string) {
        let key = ExtensionHelper.getConfiguration(command, "");
        if (!key) {
            throw new Error(`The configuration for ${ExtensionHelper.appendExtensionName(command)} is not defined.`);
        }

        return this.getCommand(key);
    }

    private async loadConstantContext() {
        ExtensionHelper.log("Loading constant context configuration...");

        this.constantContext = ExtensionHelper.getConfiguration("constant", {});

        await ContextHelper.reloadConstantContext();

        ExtensionHelper.log("Constant context configuration successfully loaded.");
    }

    private async loadContext() {
        ExtensionHelper.log("Loading context configuration...");

        this.context = ExtensionHelper.getConfiguration("context", {});

        ExtensionHelper.log("Context configuration successfully loaded.");
    }

    private async loadCommandsConfig() {
        ExtensionHelper.log("Loading commands configuration...");

        this.commands = ExtensionHelper.getConfiguration("commands", {});

        ExtensionHelper.log("Commands configuration successfully loaded.");
    }

    private static async onConfigChanged(e: vscode.ConfigurationChangeEvent) {
        if (e.affectsConfiguration(ExtensionHelper.appendExtensionName("constant"))) {
            await configManager.loadConstantContext();
        }
        if (e.affectsConfiguration(ExtensionHelper.appendExtensionName("context"))) {
            await configManager.loadContext();
        }
        if (e.affectsConfiguration(ExtensionHelper.appendExtensionName("commands"))) {
            await configManager.loadCommandsConfig();
        }
    }
}

export let configManager = new ConfigManager();