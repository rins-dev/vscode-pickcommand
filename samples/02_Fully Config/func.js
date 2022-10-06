const vscode = require("vscode");

function getSelectedFile(...args) {
    if (args[0] instanceof vscode.Uri) {
        if (args.length > 1 && Array.isArray(args[1]) && args[1].every(x => x instanceof vscode.Uri)) {
            // for explorer/context.
            return args[0].fsPath;
        }
    }
}

module.exports = {
    getSelectedFile
};