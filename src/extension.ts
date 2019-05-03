// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as color from 'color';
import * as fs from 'fs';
import * as utils from 'util';
import { processCss, Classes } from './processCss';

const readFile = utils.promisify(fs.readFile);

const JS_TYPES = ['typescriptreact','javascriptreact'];
const RecessStylesGlob = '**/recess-styles.css';

const isColor = (cssColor: string) => cssColor.startsWith('#');
function createCompletionItemProvider(items: Classes) {
	return vscode.languages.registerCompletionItemProvider(
		JS_TYPES,
		{
			provideCompletionItems(
				document: vscode.TextDocument,
				position: vscode.Position
			): vscode.CompletionItem[] {
				const range: vscode.Range = new vscode.Range(
          new vscode.Position(0, 0),
          position
        );
				const text: string = document.getText(range);
				const lines = text.split(/[\n\r]/);
				let matches = lines
          .slice(-5)
          .join('\n')
					.match(/\bclass(Name)?=["']([^"']*)$/);
				if (!matches) {
					return [];
				}
				return Object.keys(items).map(className => {
					const item = new vscode.CompletionItem(className, vscode.CompletionItemKind.Constant);
					const { property, value} = items[className];
					if (isColor(value)) {
						item.kind = vscode.CompletionItemKind.Color;
						item.documentation = color(value).rgb().string();
					}
					item.detail = `${property}: ${value}`;
					return item;
				});
			}
		},
		..."'", '"', ' ',
	);
}

async function getRecessStylesSource() {
	const files = await vscode.workspace.findFiles(RecessStylesGlob);
	if (files.length === 0) {
		return null;
	}
	const source = await readFile(files[0].path, 'utf8');
	return source;
}

// const createCompletionList = (classNames: )
class RecessStylesIntelliSense {
	private _providers: vscode.Disposable[] = [];
  private _disposable: vscode.Disposable;
	public classes: Classes;

	constructor(cssSource?: string) {
		if (cssSource) {
			this.reload(cssSource);
		}
	}

	public reload(cssSource: string) {
		this.dispose();

		this.classes = processCss(cssSource);
		this._providers.push(createCompletionItemProvider(this.classes));
		this._providers.push(
			vscode.languages.registerHoverProvider(
				[...JS_TYPES],
				{
					provideHover: (document, position, token) => {
						
						const range1: vscode.Range = new vscode.Range(
              new vscode.Position(Math.max(position.line - 5, 0), 0),
              position
            );
            const text1: string = document.getText(range1);

            if (!/\bclass(Name)?=['"][^'"]*$/.test(text1)) { return; }

            const range2: vscode.Range = new vscode.Range(
              new vscode.Position(Math.max(position.line - 5, 0), 0),
              position.with({ line: position.line + 1 })
            );
            const text2: string = document.getText(range2);

            let str = text1 + text2.substr(text1.length).match(/^([^"' ]*)/)[0];
						let matches = str.match(/\bclass(Name)?=["']([^"']*)$/);
						if (matches) {
							const currentlyHoveredClass = matches[2].split(' ').pop();

							const css = this.classes[currentlyHoveredClass];
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
							}
							const hoverStr = new vscode.MarkdownString();
							hoverStr.appendCodeblock(code, 'css');
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
							);
							return new vscode.Hover(hoverStr, hoverRange);
						}
						return null;
					}
				}
			)
		);
		this._disposable = vscode.Disposable.from(...this._providers);

	}
	dispose() {
    if (this._disposable) {
			this._disposable.dispose();
		}
	}
    
}
async function getRecessVersion() {
	const files = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**', 1);
	if (files.length === 0) {
		return null
	}
	const packageJsonSrc = await readFile(files[0].path, 'utf8');
	const packageJson = JSON.parse(packageJsonSrc)
	return packageJson.dependencies['@guildeducationinc/recess'];
}

export async function activate(context: vscode.ExtensionContext) {

	let recessStylesSource = await getRecessStylesSource();
	let currentRecessVersion = await getRecessVersion();
	const intelliSense = new RecessStylesIntelliSense(recessStylesSource);
	context.subscriptions.push(intelliSense);
		
	const watcher = vscode.workspace.createFileSystemWatcher('**/package.json');

	const { onDidChange, onDidCreate, onDidDelete } = watcher;
	onDidChange(onFileChange);
	onDidCreate(onFileChange);
	onDidDelete(onDelete);
	async function onFileChange(e: vscode.Uri) {
		const newRecessVersion = await getRecessVersion();

		if (newRecessVersion !== currentRecessVersion) {
			try {
				recessStylesSource = await getRecessStylesSource();
			} catch(e) {
				intelliSense.dispose();
				return;
			}
			if (!recessStylesSource) {
				intelliSense.dispose();
				return;
			}
	
			intelliSense.reload(recessStylesSource);
			recessStylesSource = newRecessVersion;
		}

	}

	async function onDelete () {
		intelliSense.dispose();
	}
}

// this method is called when your extension is deactivated
export function deactivate() {}
