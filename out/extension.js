"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const color = require("color");
const fs = require("fs");
const utils = require("util");
const processCss_1 = require("./processCss");
const readFile = utils.promisify(fs.readFile);
const JS_TYPES = ['typescriptreact', 'javascriptreact'];
const RecessStylesGlob = '**/recess-styles.css';
const isColor = (cssColor) => cssColor.startsWith('#');
function createCompletionItemProvider(items) {
    return vscode.languages.registerCompletionItemProvider(JS_TYPES, {
        provideCompletionItems(document, position) {
            const range = new vscode.Range(new vscode.Position(0, 0), position);
            const text = document.getText(range);
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
                const { property, value } = items[className];
                if (isColor(value)) {
                    item.kind = vscode.CompletionItemKind.Color;
                    item.documentation = color(value).rgb().string();
                }
                item.detail = `${property}: ${value}`;
                return item;
            });
        }
    }, ..."'", '"', ' ');
}
function getRecessStylesSource() {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield vscode.workspace.findFiles(RecessStylesGlob);
        if (files.length === 0) {
            return null;
        }
        const source = yield readFile(files[0].path, 'utf8');
        return source;
    });
}
// const createCompletionList = (classNames: )
class RecessStylesIntelliSense {
    constructor(cssSource) {
        this._providers = [];
        if (cssSource) {
            this.reload(cssSource);
        }
    }
    reload(cssSource) {
        this.dispose();
        this.classes = processCss_1.processCss(cssSource);
        this._providers.push(createCompletionItemProvider(this.classes));
        this._providers.push(vscode.languages.registerHoverProvider([...JS_TYPES], {
            provideHover: (document, position, token) => {
                const range1 = new vscode.Range(new vscode.Position(Math.max(position.line - 5, 0), 0), position);
                const text1 = document.getText(range1);
                if (!/\bclass(Name)?=['"][^'"]*$/.test(text1)) {
                    return;
                }
                const range2 = new vscode.Range(new vscode.Position(Math.max(position.line - 5, 0), 0), position.with({ line: position.line + 1 }));
                const text2 = document.getText(range2);
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
                    }
                    else if (selector.indexOf('active') !== -1) {
                        selector += ':active';
                    }
                    else if (selector.indexOf('focus') !== -1) {
                        selector += ':focus';
                    }
                    let code = `${selector} {\n  ${css.property}: ${css.value};\n}`;
                    if (css.mediaParent) {
                        code = `@media screen ${css.mediaParent} {\n ${code.replace(/^/gm, '  ')} \n }`;
                    }
                    const hoverStr = new vscode.MarkdownString();
                    hoverStr.appendCodeblock(code, 'css');
                    const hoverRange = new vscode.Range(new vscode.Position(position.line, position.character +
                        str.length -
                        text1.length -
                        currentlyHoveredClass.length), new vscode.Position(position.line, position.character + str.length - text1.length));
                    return new vscode.Hover(hoverStr, hoverRange);
                }
                return null;
            }
        }));
        this._disposable = vscode.Disposable.from(...this._providers);
    }
    dispose() {
        if (this._disposable) {
            this._disposable.dispose();
        }
    }
}
function getRecessVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield vscode.workspace.findFiles('**/package.json', '**/node_modules/**', 1);
        if (files.length === 0) {
            return null;
        }
        const packageJsonSrc = yield readFile(files[0].path, 'utf8');
        const packageJson = JSON.parse(packageJsonSrc);
        return packageJson.dependencies['@guildeducationinc/recess'];
    });
}
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        let recessStylesSource = yield getRecessStylesSource();
        let currentRecessVersion = yield getRecessVersion();
        const intelliSense = new RecessStylesIntelliSense(recessStylesSource);
        context.subscriptions.push(intelliSense);
        const watcher = vscode.workspace.createFileSystemWatcher('**/package.json');
        const { onDidChange, onDidCreate, onDidDelete } = watcher;
        onDidChange(onFileChange);
        onDidCreate(onFileChange);
        onDidDelete(onDelete);
        function onFileChange(e) {
            return __awaiter(this, void 0, void 0, function* () {
                const newRecessVersion = yield getRecessVersion();
                if (newRecessVersion !== currentRecessVersion) {
                    try {
                        recessStylesSource = yield getRecessStylesSource();
                    }
                    catch (e) {
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
            });
        }
        function onDelete() {
            return __awaiter(this, void 0, void 0, function* () {
                intelliSense.dispose();
            });
        }
    });
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map