// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as color from 'color';
import { classNames, Classes } from './classNames';


const JS_TYPES = ['typescriptreact', 'javascript', 'javascriptreact'];
const isColor = (cssColor: string) => cssColor.startsWith('#')
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
				const text: string = document.getText(range);
				const lines = text.split(/[\n\r]/);
				let matches = lines
          .slice(-5)
          .join('\n')
					.match(/\bclass(Name)?=["']([^"']*)$/)
				if (!matches) {
					return []
				}
				return Object.keys(items).map(className => {
					const item = new vscode.CompletionItem(className, vscode.CompletionItemKind.Constant)
					const { property, value} = items[className];
					if (isColor(value)) {
						console.log(color(value))
						item.kind = vscode.CompletionItemKind.Color;
						item.documentation = color(value).rgb().string();
					}
					item.detail = `${property}: ${value}`;
					return item;
				})
			}
		},
		..."'", '"', ' ',
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
		this._providers.push(
			vscode.languages.registerHoverProvider(
				[...JS_TYPES],
				{
					provideHover: (document, position, token) => {
						console.log(position)
						
						const range1: vscode.Range = new vscode.Range(
              new vscode.Position(Math.max(position.line - 5, 0), 0),
              position
            )
            const text1: string = document.getText(range1)

            if (!/\bclass(Name)?=['"][^'"]*$/.test(text1)) return

            const range2: vscode.Range = new vscode.Range(
              new vscode.Position(Math.max(position.line - 5, 0), 0),
              position.with({ line: position.line + 1 })
            )
            const text2: string = document.getText(range2)

            let str = text1 + text2.substr(text1.length).match(/^([^"' ]*)/)[0]
						let matches = str.match(/\bclass(Name)?=["']([^"']*)$/)
						if (matches) {
							const currentlyHoveredClass = matches[2].split(' ').pop()

							const css = this.classes[currentlyHoveredClass]
							if (!css) {
								return null;
							}
							let selector = currentlyHoveredClass;
							selector = selector.replace(/:/, '/:');
							if (selector.indexOf('hover') !== -1) {
								selector += ':hover';
							} else if (selector.indexOf('active') !== -1) {
								selector += ':active';
							}
							else if (selector.indexOf('focus') !== -1) {
								selector += ':focus';
							}
							let code =`${selector} {\n  ${css.property}: ${css.value};\n}`;
							

							if (css.mediaParent) {
								code = `@media screen ${css.mediaParent} {\n ${code.replace(/^/gm, '  ')} \n }`;
								console.log(css.mediaParent)
							}
							const hoverStr = new vscode.MarkdownString()
							hoverStr.appendCodeblock(code, 'css')
							const hoverRange = new vscode.Range(
								new vscode.Position(
									position.line,
									position.character +
										str.length -
										text1.length -
										currentlyHoveredClass.length
								),
								new vscode.Position(
									position.line,
									position.character + str.length - text1.length
								)
							)
							return new vscode.Hover(hoverStr, hoverRange)
						}
						return null;
					}
				}
			)
		)
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
