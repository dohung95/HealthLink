import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const roots = ['test', 'src'];

async function collectNodeTests(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
        const fullPath = join(directory, entry.name);
        if (entry.isDirectory()) {
            return collectNodeTests(fullPath);
        }
        if (!entry.isFile() || !/\.test\.(js|mjs)$/.test(entry.name)) {
            return [];
        }
        const source = await readFile(fullPath, 'utf8');
        return source.includes('node:test') ? [fullPath] : [];
    }));
    return nested.flat();
}

const files = (await Promise.all(roots.map(collectNodeTests))).flat();
if (files.length === 0) {
    throw new Error('No node:test files were found.');
}

const child = spawn(process.execPath, ['--test', ...files], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
