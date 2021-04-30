// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { commandManager } from './base/command';
import { configManager } from './base/config';
import { ExtensionHelper } from './extension_helper';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	ExtensionHelper.setContext(context);

	ExtensionHelper.log(`Activating ${ExtensionHelper.EXTENSION_DISPLAY_NAME}...`);
	
	await configManager.init();

	commandManager.init();

	ExtensionHelper.log(`${ExtensionHelper.EXTENSION_DISPLAY_NAME} is activated.`);
	
}

// this method is called when your extension is deactivated
export function deactivate() {}
