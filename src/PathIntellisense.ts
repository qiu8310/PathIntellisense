import { CompletionItemProvider, TextDocument, Position, CompletionItem, workspace, Range, CompletionItemKind } from 'vscode';
import { isImportExportOrRequire, getTextWithinString, importStringRange } from './utils/text-parser';
import { getPath, extractExtension, Mapping, getNpmModulesPath, getNpmModulesMappings, getMappingsPath } from './utils/fs-functions';
import { PathCompletionItem } from './completionItems/PathCompletionItem';
import { UpCompletionItem } from './completionItems/UpCompletionItem';
import { getConfig, Config, getTsConfig } from './utils/config';
import {Request} from './utils/request'

export class PathIntellisense implements CompletionItemProvider {

    private config: Config;
    private tsConfig: {};

    constructor(private getChildrenOfPath: Function) {
        this.setConfig();
        workspace.onDidChangeConfiguration(() => this.setConfig());
        getTsConfig().then(tsconfig => {
            this.tsConfig = tsconfig;
            this.setConfig();
        });
    }

    provideCompletionItems(document: TextDocument, position: Position): Thenable<CompletionItem[]> {
        const textCurrentLine = document.getText(document.lineAt(position).range);
        const textToPosition = textCurrentLine.substring(0, position.character);

        const request: Request = {
            // 每次都重新获取 npm 的 mapping，因为有可能安装新包
            config: {...this.config, mappings: this.config.mappings.concat(getNpmModulesMappings())},
            document,
            position,
            fileName: document.fileName,
            textCurrentLine,
            quotationPosition: Math.max(textToPosition.lastIndexOf('\"'), textToPosition.lastIndexOf('\'')),
            textWithinString: getTextWithinString(textCurrentLine, position.character),
            importRange: importStringRange(textCurrentLine, position),
            isImport: isImportExportOrRequire(textCurrentLine),
            documentExtension: extractExtension(document)
        };

        // (this.shouldProvide(request) ? this.provide(request) : Promise.resolve([])).then(d => console.log(d))
        // console.log(this.shouldProvide(request))
        return this.shouldProvide(request) ? this.provide(request) : Promise.resolve([]);
    }

    shouldProvide(request: Request) {
        const typedAnything = request.textWithinString && request.textWithinString.length > 0;
        const startsWithDot = typedAnything && request.textWithinString[0] === '.';
        const startsWithMapping = typedAnything && request.config.mappings.some(mapping => request.textWithinString.indexOf(mapping.key) === 0);

        if (request.isImport && (startsWithDot || startsWithMapping || request.textWithinString === '')) {
            return true;
        }

        if (!request.isImport && typedAnything) {
            return true;
        }

        return false;
    }

    // 从 NpmIntellisense 中提取出来的函数
    importStringRange(request: Request) : Range {
        let textCurrentLine = request.document.lineAt(request.position).text
        let cursorLine = request.position.line
        let cursorPosition = request.position.character

        const textToPosition = textCurrentLine.substring(0, cursorPosition);
        const quotationPosition = Math.max(textToPosition.lastIndexOf('\"'), textToPosition.lastIndexOf('\''));
        return new Range(cursorLine, quotationPosition + 1, cursorLine, cursorPosition)
    }

    provide(request: Request) {
        const dir = getPath(request.fileName, request.textWithinString, request.config.absolutePathToWorkspace ? workspace.rootPath : null, request.config.mappings);
        let getItem = (fileinfo) => new PathCompletionItem(fileinfo, request)

        if (request.textWithinString === '') {
            request.importRange = this.importStringRange(request)
            return Promise.resolve([
                new UpCompletionItem(),
                ...getMappingsPath(request.config.mappings).map(getItem)
            ])
        }

        return this.getChildrenOfPath(dir, request.config).then(children => ([
            new UpCompletionItem(),
            ...children.map(fi => getItem(fi))
        ]));
    }

    setConfig() {
        this.config = getConfig(this.tsConfig);
    }
}
