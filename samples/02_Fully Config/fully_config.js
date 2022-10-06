const vscode = require("vscode");
const func = require("./func_copy");
const path = require("path");

let selectedFile;
module.exports = {
    when: (...args) => {
        selectedFile = func.getSelectedFile(...args);
        return selectedFile !== undefined && selectedFile.match(/.js$/i);
    },
    label: (...args) => `Show message for ${path.basename(selectedFile)}`,
    description: (...args) => `Sample`,
    detail: (...args) => `Will show filename if you select a js file`,
    order: (...args) => -1,
    pickcommand: (...args) => vscode.window.showInformationMessage(`You have selected ${selectedFile}`)
};