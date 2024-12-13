import * as fs from "fs";
import * as path from "path";
import * as vscode from 'vscode';
import { VSC } from "./common";
import { Converter } from "./converters";
import { PickCommand, PickContext, PickItem } from "../docs/samples/pickcommand";

interface VSCPickItem extends PickItem {
	context: PickContext,
	error?: Error,
	pickcommand: PickCommand["pickcommand"]
}

interface PickCommandFile {
	path: string;
	mtime: number;
	command?: PickCommand;
}

interface PickCommandFolder {
	uri: vscode.Uri,
	name: string,
	description?: string,
	files?: PickCommandFile[],
}

function createContext(args: unknown[]): PickContext {
	// used for commandPalette
	const context: PickContext = {
		ARGUMENTS: args,
		SELECTED_FILE: undefined,
		SELECTED_FILES: [],
		log: vsc.logger.info,
		require: function (path: string): any {
			delete require.cache[require.resolve(path)];
    		return require(path);
		}
	};
    const is_uri = (x: unknown) => x instanceof vscode.Uri;
    const is_uri_array = (x: unknown) => Array.isArray(x) && x.every(is_uri);
    if (args.length > 0) {
		const arg0 = args[0];
		const arg1 = args[1];
        if (is_uri(arg0)) {
            if (is_uri_array(arg1)) {
				// used for explorer/context
				return {
					...context,
					SELECTED_FILE: arg0,
					SELECTED_FILES: arg1
				};
            } else {
				// used for editor/title/context
				return {
					...context,
					SELECTED_FILE: arg0,
					SELECTED_FILES: [arg0]
				};
            }
        } else {
            const resources = args.map((x: any) => (x as vscode.SourceControlResourceState).resourceUri);
            if (is_uri_array(resources)) {
                // USED for scm/resourceState/context & scm/resourceFolder/context
				return {
					...context,
					SELECTED_FILE: resources[0],
					SELECTED_FILES: resources
				};
            }
        }
    }
    return context;
}

async function loadPickItem(file: PickCommandFile, args: unknown[]): Promise<VSCPickItem | false | undefined> {
	if (file.command === undefined) return undefined;
	const is_pickitem = (x: unknown) => typeof x === 'object' && x !== null;
	try {
		const context = createContext(args);
		let pickitem: PickItem;
		if (file.command.pickitem !== undefined) {
			const result = await file.command.pickitem(context);
			if (is_pickitem(result)) {
				pickitem = result;
			} else if (typeof result === 'string') {
				pickitem = { label: result };
			} else if (result === undefined) {
				// Not need to show
				return undefined;
			} else {
				vsc.logger.error(`Unknown return type of pickitem.`, 'file:', file.path, 'return:', result);
				return false;
			}
		} else {
			pickitem = { label: path.basename(file.path) };
		}
		return {
			...pickitem,
			context,
			pickcommand: file.command.pickcommand
		};
	} catch (err) {
		vsc.logger.error(`Call pickitem with error`, 'file:', file.path, 'error:', err);
		return false;
	}
	
}

async function executePickCommand(...args: unknown[]) {
	reloadPickCommands();
	if (pickcommand_folders.every(x => x.files === undefined || x.files.filter(f => f.command !== undefined).length === 0)) {
		return vsc.message.info(`No pickcommand found.`);
	}
	let error_cnt = 0;
	const pickitems: VSCPickItem[] = [];
	for (const folder of pickcommand_folders) {
		if (folder.files === undefined) continue;

		const result = await Promise.all(folder.files.map(file => loadPickItem(file, args)));
		error_cnt += result.filter(x => x === false).length;
		const items = result.filter((x) : x is VSCPickItem => Boolean(x));
		items.sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
		if (items.length) {
			pickitems.push({
				kind: vscode.QuickPickItemKind.Separator,
				label: folder.name
			} as VSCPickItem);
			pickitems.push(...items);
		}
	}
	if (error_cnt > 0) {
		vsc.message.error(`${error_cnt} commands run pickitem with error`, { "Show Detail": vsc.logger.show });
	}
	if (pickitems.length === 0) {
		return vsc.message.warn(`No pickcommand matched.`);
	}
	const item = await vscode.window.showQuickPick(pickitems);
	if (item === undefined) return undefined;
	return item.pickcommand(item.context);
}

function isOptionalFunction(obj: unknown) {
	return obj === undefined || isFunction(obj);
}
function isFunction(obj: unknown) {
	return typeof obj === 'function';
}

function isPickCommand(obj: unknown): obj is PickCommand {
    if (typeof obj !== 'object' || obj === null) return false;
	
	const command = obj as PickCommand;
	return isFunction(command.pickcommand)
		&& isOptionalFunction(command.pickitem);
}

function unloadPickCommands() {
	if (pickcommand_folders.length > 0) {
		for (const folders of pickcommand_folders) {
			if (folders.files !== undefined) {
				for (const file of folders.files) {
					delete require.cache[file.path];
					vsc.logger.info(`remove ${file.path}...`);
				}
			}
		}
		pickcommand_folders = [];
	}
}

async function reloadPickCommands() {
	function loadFolderFiles(folder: vscode.WorkspaceFolder): PickCommandFolder {
		const uri = vscode.Uri.joinPath(folder.uri, '.vscode', 'pickcommand');
		const name = folder.name;
		let files: PickCommandFile[] | undefined;
		let description = "";

		const folderPath = uri.fsPath;
		if (!fs.existsSync(folderPath)) {
			description = "missing";
		} else if (!fs.statSync(folderPath).isDirectory()) {
			description = "error";
		} else {
			files = [];
			for (const filename of fs.readdirSync(folderPath)) {
				const filePath = path.join(folderPath, filename);
				const stat = fs.statSync(filePath);
				if (stat.isFile() && filename.match(/\.js$/i)) {
					files.push({
						path: filePath,
						mtime: stat.mtime.getTime()
					});
				}
			}
			description = `${files.length} files`;
		}
		return {
			name,
			uri,
			files,
			description
		};
	}

	function loadPickCommands() {
		let error_cnt = 0, success_cnt = 0, skip_cnt = 0;
		for (const folder of pickcommand_folders) {
			if (folder.files === undefined) continue;

			let error_cnt_per_folder = 0, success_cnt_per_folder = 0, skip_cnt_per_folder = 0;
			for (const file of folder.files) {
				try {
					const command = require(file.path);
					if (isPickCommand(command)) {
						file.command = command;
						vsc.logger.trace(`load ${file.path}.`);
						success_cnt_per_folder++;
					} else {
						vsc.logger.trace(`skip ${file.path}.`);
						skip_cnt_per_folder++;
					}
				} catch (err) {
					vsc.logger.error(`error load ${file.path}.`, err as Error);
					error_cnt_per_folder++;
				}
			}
			if (error_cnt_per_folder === 0) {
				folder.description = `${success_cnt_per_folder} commands`;
			} else {
				folder.description = `${success_cnt_per_folder} commands and ${error_cnt_per_folder} errors`;
			}
			error_cnt += error_cnt_per_folder;
			success_cnt += success_cnt_per_folder;
			skip_cnt += skip_cnt_per_folder;
		}
		const showMessage = error_cnt === 0 ? vsc.message.info : vsc.message.error;
		const message = error_cnt === 0 ? `Load ${success_cnt} commands successful.` : `Load ${success_cnt} commands and ${error_cnt} errors.`;
		showMessage(message, { "Show Detail": vsc.logger.show });
	}

	function loadPickCommandFiles() {
		const folders: PickCommandFolder[] = [];

		folders.push(loadFolderFiles({
			name: "GLOBAL",
			uri: vsc._context.globalStorageUri,
			index: -1
		}));
	
		const HOME = process.env['HOME'];
		if (HOME !== undefined) {
			folders.push(loadFolderFiles({
				name: 'HOME',
				uri: vscode.Uri.file(HOME),
				index: -1
			}));
		}

		const workspaces = vscode.workspace.workspaceFolders;
		if (workspaces !== undefined) {
			for (const workspace of workspaces) {
				folders.push(loadFolderFiles(workspace));
			}
		}
		return folders;
	}

	function needReload(old_folders: PickCommandFolder[], new_folders: PickCommandFolder[]) {
		const new_files = new_folders.flatMap(x => x.files ?? []);
		const old_files = old_folders.flatMap(x => x.files ?? []);
		if (new_files.length !== old_files.length) return true;
		const new_file_map = Converter.arrayToObject(new_files, x => x.path, x => x.mtime);
		const old_file_map = Converter.arrayToObject(old_files, x => x.path, x => x.mtime);
		for (const [path, mtime] of Object.entries(old_file_map)) {
			if (new_file_map[path] !== mtime) return true;
		}
		return false;
	}

	const new_folders = loadPickCommandFiles();
	if (needReload(pickcommand_folders, new_folders)) {
		vsc.logger.trace(`Files has been changed, start to reload`);
		unloadPickCommands();
		pickcommand_folders = new_folders;
		loadPickCommands();
		vsc.logger.trace(`Files has been changed, start to reload`);
	}
}

async function writePickCommands() {
	reloadPickCommands();
	const folder = await vscode.window.showQuickPick(pickcommand_folders.map(x => ({
		label: x.name,
		description: x.description,
		folder: x
	})));
	if (folder !== undefined) {
		await vscode.workspace.fs.createDirectory(folder.folder.uri);
		vscode.commands.executeCommand("vscode.openFolder", folder.folder.uri, {
			forceNewWindow: true
		});
	}
}

let pickcommand_folders: PickCommandFolder[] = [];
let vsc: VSC;

export function activate(context: vscode.ExtensionContext) {
	vsc = new VSC(context);
	vsc.registerCommand("pickcommand.executecommands", executePickCommand);
	vsc.registerCommand("pickcommand.writecommands", writePickCommands);
}


export function deactivate() {
	unloadPickCommands();
}
