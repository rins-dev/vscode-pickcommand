const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const BASH_PATH = 'C:/Program Files/Git/bin/bash.exe';
const SETTING_FILE = ".vscode/pickcommand/open_ssh_settings.json";


exports.pickitem = (context) => {
    // Search SETTING_FILE from folder, when not found continue searching in the parent folders.
    function find_setting_from(dir) {
        const file = path.join(dir, SETTING_FILE);
        if (fs.existsSync(file) && fs.statSync(file).isFile()) {
            // Save SETTING_FILE path and the folder to context, then it can be used in pickcommand
            context.settingFile = file;
            context.settingDir = dir;
            return true;
        }

        let parentDir = path.dirname(dir);
        if (parentDir === dir) return false;
        return find_setting_from(parentDir);
    }

    const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (folder !== undefined && find_setting_from(folder)) return "SSH";
};

exports.pickcommand = async (context) => {
    // reload settings from SETTING_FILE
    const SSH_SETTINGS = context.require(context.settingFile);

    // The first pickitem shows SETTING_FILE, so you can easily modify it.
    const items = [{ 
        label: "SETTINGS", description: 'Open settings...'
    }, {
        kind: vscode.QuickPickItemKind.Separator
    }].concat(SSH_SETTINGS);

    const item = await vscode.window.showQuickPick(items);
    if (item === undefined) return;
    if (item === items[0]) return vscode.window.showTextDocument(vscode.Uri.file(context.settingFile));

    item.username ??= 'root';
    item.port ??= 22;
    item.args ??= "";
    
    // open ssh in terminal
    let ssh_cmd = `ssh ${item.username}@${item.host} -p ${item.port} ${item.args}`;
    const terminal = vscode.window.createTerminal({
        name: item.label,
        cwd: context.settingDir,
        shellPath: BASH_PATH,
        shellArgs: [ "-c", ssh_cmd ]
    });
    if (item.password !== undefined) terminal.sendText(item.password);
    terminal.show();

    if (item.commands !== undefined) {
        for (const command of item.commands) {
            terminal.sendText(command);
        }
    }
}