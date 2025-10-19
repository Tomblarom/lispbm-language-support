const vscode = require('vscode');
const { formatLispBM } = require('./formatter');

function activate(context) {
  const provider = vscode.languages.registerDocumentFormattingEditProvider('lispbm', {
    provideDocumentFormattingEdits(document) {
      const fullText = document.getText();
      const configuration = vscode.workspace.getConfiguration('lispbm');
      const stackClosings = configuration.get('format.stackClosingBrackets', true);
      const formatted = formatLispBM(fullText, {
        stackClosingBrackets: stackClosings
      });
      const lastLine = document.lineCount > 0 ? document.lineCount - 1 : 0;
      const lastLineLength = document.lineCount > 0 ? document.lineAt(lastLine).text.length : 0;
      const entireRange = new vscode.Range(0, 0, lastLine, lastLineLength);
      return [vscode.TextEdit.replace(entireRange, formatted)];
    }
  });

  context.subscriptions.push(provider);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
