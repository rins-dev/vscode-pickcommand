const vscode = require("vscode");

module.exports = {
    pickcommand: () => vscode.window.showInformationMessage("Hello world!")
};