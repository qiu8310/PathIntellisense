import { CompletionItem, CompletionItemKind, Range, TextEdit } from 'vscode';
import { FileInfo } from '../utils/file-info';
import { workspace } from 'vscode';
import { Config } from '../utils/config';
import { Request } from '../utils/request'

export class PathCompletionItem extends CompletionItem {
    constructor(fileInfo: FileInfo, request: Request) {
        super(fileInfo.file);

        let {importRange, isImport, documentExtension, config} = request

        this.kind = fileInfo.path.indexOf('node_modules') >= 0 ? CompletionItemKind.Module : CompletionItemKind.File;

        this.addGroupByFolderFile(fileInfo);
        this.removeExtension(config.withExtension, fileInfo, isImport, documentExtension, importRange);
        this.addSlashForFolder(fileInfo, importRange, config.autoSlash);
    }

    addGroupByFolderFile(fileInfo: FileInfo) {
        this.sortText = `${fileInfo.path.indexOf('node_modules') >= 0 ? 'c' : fileInfo.isFile ? 'b' : 'a'}_${fileInfo.file}`;
    }

    addSlashForFolder(fileInfo: FileInfo, importRange: Range, autoSlash: boolean) {
        if (!fileInfo.isFile) {
            this.label = `${fileInfo.file}/`;
            var newText = autoSlash ? `${fileInfo.file}/` : `${fileInfo.file}`;
            this.textEdit = new TextEdit(importRange, newText);
        }
    }

    removeExtension(withExtension: boolean, fileInfo: FileInfo, isImport: boolean, documentExtension:string, importRange: Range) {
        if (!fileInfo.isFile || withExtension || !isImport) {
            return;
        }

        const fragments = fileInfo.file.split('.');
        const extension = fragments[fragments.length - 1];

        if (
            extension !== documentExtension
            || 'ts' === extension && ['tsx'].indexOf(documentExtension) >= 0
            || 'js' === extension && ['jsx'].indexOf(documentExtension) >= 0
        ) {
            return;
        }

        let index = fileInfo.file.lastIndexOf('.');
        const newText = index != -1 ? fileInfo.file.substring(0, index) : fileInfo.file;
        this.textEdit = new TextEdit(importRange, newText);
    }
}
