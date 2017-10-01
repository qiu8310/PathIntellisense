import { readdir } from 'fs';
import * as path from 'path';
import { FileInfo } from './file-info';
import { TextDocument, workspace } from 'vscode';
import { Config } from "./config";
import * as minimatch from 'minimatch';

export interface Mapping {
    key: string,
    value: string
}

export function getChildrenOfPath(filepath: string, config: Config) {
    return readdirPromise(filepath)
        .then(files => files
            .filter(filename => filterFile(filepath, filename, config))
            .map(f => new FileInfo(filepath, f)))
        .catch(() => []);
}

export function getNpmModulesMappings() {
    let pkg = require(path.join(workspace.rootPath, 'package.json'))
    let arr = [pkg.dependencies, pkg.devDependencies]
    return arr.reduce((result, item) => {
        if (item) {
            Object.keys(item).forEach(key => {
                if (key.indexOf('@types') !== 0) result.push({key, npm: true, value: path.join(workspace.rootPath, 'node_modules', key)})
            })
        }
        return result
    }, [])
}

export function getNpmModulesPath() {
    return getNpmModulesMappings().map(({key, value}) => new FileInfo(path.join(workspace.rootPath, 'node_modules'), key))
}

export function getMappingsPath(mappings) {
    return mappings.map(({key, value}) => new FileInfo(path.dirname(value), path.basename(value)))
}

/**
 * @param fileName  {string} current filename the look up is done. Absolute path
 * @param text      {string} text in import string. e.g. './src/'
 */
export function getPath(fileName: string, text: string, rootPath?: string, mappings?: Mapping[]) : string {
    const normalizedText = path.normalize(text);
    const textAfterLastSlashRemoved = normalizedText.substring(0, normalizedText.lastIndexOf(path.sep) + 1);
    const isPathAbsolute = normalizedText.startsWith(path.sep);

    let rootFolder = path.dirname(fileName);
    let pathEntered = normalizedText;

    // Search a mapping for the current text. First mapping is used where text starts with mapping
    const mapping = mappings && mappings.reduce((prev, curr) => {
        let start = curr.key.endsWith(path.sep) ? curr.key : curr.key + path.sep // 保证后面带一个路径，否则容易误操作
        return prev || (normalizedText.startsWith(start) && curr)
    }, undefined);

    if (mapping) {
        rootFolder = mapping.value;
        pathEntered = normalizedText.substring(mapping.key.length, normalizedText.length);
    }

    if(isPathAbsolute) {
        rootFolder = rootPath || '';
    }

    return path.join(rootFolder, pathEntered);
}

export function extractExtension(document: TextDocument) {
    if (document.isUntitled) {
        return undefined;
    }

    const fragments = document.fileName.split('.');
    const extension = fragments[fragments.length - 1];

    if (!extension || extension.length > 3) {
        return undefined;
    }

    return extension;
}

function readdirPromise(path: string) {
    return new Promise<string[]>((resolve, reject) => {
        readdir(path, (error, files) => {
            if(error){
                reject(error);
            } else {
                resolve(files);
            }
        });
    });
}

function filterFile(filepath: string, filename: string, config: Config) {
    if (filename.endsWith('.d.ts')) {
        return false
    }
    if (config.showHiddenFiles) {
        return true;
    }
    return isFileHidden(filepath, filename, config) ? false : true;
}

function isFileHidden(filepath: string, filename: string, config: Config) {
    return filename.startsWith('.') || isFileHiddenByVsCode(filepath, filename, config);
}

/**
 * files.exclude has the following form. key is the glob
 * {
 *    "**//*.js": true
 *    "**//*.js": true "*.git": true
 *    "foo": true   // src/foo should not be hidden
 * }
 */
function isFileHiddenByVsCode(filepath: string, filename: string, config: Config) {
    return config.filesExclude && Object.keys(config.filesExclude)
        .some(key => {
            return config.filesExclude[key] &&
                minimatch(path.join(filepath, filename), path.join(workspace.rootPath, key).replace(/\/$/, '')) // ignore suffix slash
        });
}
