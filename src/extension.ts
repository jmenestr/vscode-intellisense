// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { classNames, Classes } from './classNames';


const JS_TYPES = ['typescriptreact', 'javascript', 'javascriptreact'];
function createCompletionItemProvider(items: Classes) {
	return vscode.languages.registerCompletionItemProvider(
		JS_TYPES,
		{
			provideCompletionItems(
				document: vscode.TextDocument,
				position: vscode.Position
			): vscode.CompletionItem[] {
				console.log(document)
				const range: vscode.Range = new vscode.Range(
          new vscode.Position(0, 0),
          position
        );
        // const text: string = document.onsgetText(range)
				return Object.keys(items).map(className => {
					const item = new vscode.CompletionItem(className, vscode.CompletionItemKind.Constant)
					const { property, value} = items[className];
					item.detail = `${property}: ${value}`;
					return item;
				})
			}
		},
		...['`', ' '],
	);
}

// const createCompletionList = (classNames: )
class RecessStylesIntelliSense {
	private _providers: vscode.Disposable[] = []
  private _disposable: vscode.Disposable
	public classes: Classes;

	constructor(classes: Classes) {
		this.classes = classes;

		this._providers.push(createCompletionItemProvider(this.classes));
		this._disposable = vscode.Disposable.from(...this._providers)
	}
	dispose() {
    if (this._disposable) {
			this._disposable.dispose()
		}
	}
    
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
		console.log('Congratulations, your extension "vscode-recessstyles" is now active!');

	const intelliSense = new RecessStylesIntelliSense(classNames);
	context.subscriptions.push(intelliSense)
	console.log(intelliSense.classes);
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World!');
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
