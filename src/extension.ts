// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as path from "path";
import * as vscode from 'vscode';

type ValueType<T> =((...args: unknown[]) => T | Promise<T>);

interface PickCommand {
	init?: ValueType<void>;
	when?: ValueType<boolean>;
	label?: ValueType<string>;
	description?: ValueType<string | undefined>;
	detail?: ValueType<string | undefined>;
	order?: ValueType<number>;
    pickcommand: ValueType<any>;
}

interface StoreCommand {
	file: string;
	command: PickCommand;
}

interface PickItem {
	label: string,
	description: string | undefined,
	detail: string | undefined,
	order: number,
	command: PickCommand
}


function isPickCommand(obj: unknown): obj is PickCommand {
    if (typeof obj !== 'object' || obj === null) return false;
	const command = obj as PickCommand;
	return typeof command.pickcommand === 'function'
		&& (command.init === undefined || typeof command.init === 'function')
		&& (command.when === undefined || typeof command.when === 'function')
		&& (command.label === undefined || typeof command.label === 'function')
		&& (command.description === undefined || typeof command.description === 'function')
		&& (command.detail === undefined || typeof command.detail === 'function')
		&& (command.order === undefined || typeof command.order === 'function');
}

function loadPickCommand(file: string): StoreCommand | undefined {
	if (file in require.cache) delete require.cache[file];
	const command = require(file);
	if (isPickCommand(command)) {
		return { file, command };
	} else {
		delete require.cache[file];
	}
}

function loadPickCommands(dir: string): StoreCommand[] {
	const commands: StoreCommand[] = [];
	for (const file of fs.readdirSync(dir)) {
		if (file.match(/\.js$/i)) {
			const fullpath = path.join(dir, file);
			const command = loadPickCommand(fullpath);
			if (command !== undefined) commands.push(command);
		}
	}
	return commands;
}


async function makePickItem(store: StoreCommand, args: unknown[]): Promise<PickItem | undefined> {
	await store.command.init?.(...args);
	
	if (store.command.when) {
		const when = await store.command.when(...args);
		if (!when) return undefined;
	}

	const label = await store.command.label?.(...args) ?? path.basename(store.file);
	const description = await store.command.description?.(...args);
	const detail = await store.command.detail?.(...args);
	const order = await store.command.order?.(...args) ?? 0;
	const command = store.command;

	return {
		label,
		description,
		detail,
		order,
		command
	};
}

export function activate(context: vscode.ExtensionContext) {
	const subscription = vscode.commands.registerCommand("pickcommand.commands", async (...args) => {
		try {
			const dir = vscode.workspace.getConfiguration().get('pickcommand.directory', '');
			if (dir === '' || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
				return vscode.window.showErrorMessage(`pickcommand.directory is not a valid directory.`);
			}
			const commands = loadPickCommands(dir);
			if (commands.length === 0) {
				return vscode.window.showWarningMessage(`No pickcommands found.`);
			}
			const pickitems: PickItem[] = [];
			for await (const item of commands.map(x => makePickItem(x, args))) {
				if (item !== undefined) {
					pickitems.push(item);
				}
			}
			if (pickitems.length === 0) {
				return vscode.window.showWarningMessage(`No pickcommands matched.`);
			}

			const item = await vscode.window.showQuickPick(pickitems.sort((a,b) => a.order - b.order));
			if (item === undefined) return;
			return item.command.pickcommand(...args);
		} catch (err) {
			console.error(err);
			return vscode.window.showErrorMessage((err as Error).message);
		}
	});
	context.subscriptions.push(subscription);
}


export function deactivate() {}
