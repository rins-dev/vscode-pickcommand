import * as vscode from 'vscode';

interface PickContext {
	/**
	 * The raw parameters of command passed.
	 */
	readonly ARGUMENTS: unknown[];
	/**
	 * The selected file when run command by menus as `explorer/context`, `editor/title/context`, etc.
	 */
	readonly SELECTED_FILE: vscode.Uri | undefined;
	/**
	 * The selected files when run command by menus as `explorer/context`, `editor/title/context`, etc.
	 */
	readonly SELECTED_FILES: vscode.Uri[];

	/**
	 * Write info log to [LogOutputChannel](https://code.visualstudio.com/api/references/vscode-api#LogOutputChannel) named `PickCommand`
	 * 
	 * It is an easy way to use `vscode.LogOutputChannel.info` method.
	 * 
	 * It can be used to debug your own commands.
	 */
	log(message: string, ...args: any[]): void;

	/**
	 * Used as Node's require() function to import a module by path, and will reimport it when it has been imported.
	 * 
	 * It can be easily to reload setting file like `json` that you modify frequently.
	 * 
	 * *Any `js` file directly in `.vscode/pickcommand` will automatic reload when changed.*
	 * 
	 * @param path the path of a module
	 */
	require(path: string): any;
}

interface PickItem extends vscode.QuickPickItem {
	/**
	 * The order for QuickPickItem. The bigger is on top. Default value is 0.
	 */
	order?: number
}

interface PickCommand {
	/**
	 * The function called to check whether the command should be shown or not.
	 * 
	 * Returns a `PickItem` or `string` to show the command, or `undefined` to hide it.
	 * 
	 * @param context parameter context @see PickContext
	 */
    pickitem?(context: PickContext): PickItem | string | undefined | Promise<PickItem | string | undefined>,

	/**
	 * The function called when you picked the command.
	 * @param context parameter context @see PickContext
	 */
    pickcommand(context: PickContext): any;
}
