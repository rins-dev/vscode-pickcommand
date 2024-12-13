const vscode = require("vscode"); 
const { exec } = require('child_process');
const path = require('path');

module.exports = {
  pickitem: (context) => {
    if (!context.SELECTED_FILE) return undefined;
    return `Open: ${path.basename(context.SELECTED_FILE.fsPath)}`;
  },

  pickcommand: (context) => {
    exec(`start "" "${context.SELECTED_FILE.fsPath}"`, err => {
      if (err) return vscode.window.showErrorMessage(err.message);
    });
  }
};