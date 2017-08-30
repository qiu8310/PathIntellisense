import { Range, Position, TextDocument } from 'vscode';
import { Config } from './config';

export interface Request {
  config?: Config,
  position?: Position,
  document?: TextDocument,
  fileName?: string,
  textCurrentLine?: string,
  textWithinString?: string,
  quotationPosition?: number,
  importRange?: Range,
  isImport?: boolean,
  documentExtension?: string
}
