import { statSync } from 'fs';
import { join } from 'path';

export class FileInfo {
    file: string;
    isFile: boolean;

    constructor(public path: string, file: string) {
        this.file = file;
        try {
            // 配置了 mappings，但没有对应的文件，就会导致报错
            this.isFile = statSync(join(path, file)).isFile();
        } catch (e) {}
    }
}
