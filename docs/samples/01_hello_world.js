
const vscode = require("vscode");

exports.pickcommand = context => {
    context.log(`context`, context);
    vscode.window.showInformationMessage(`Hello world!`);
}

