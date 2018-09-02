const fs = require('fs');
const path = require('path');
const {promisify} = require('util');
const stat = promisify(fs.stat);
const dt = require('directory-tree');
const {startCase} = require('lodash');

// Returns a valid file path or false if not found
export const lookupFile = async (p: string, dir: string) => {
    let stats;
    let _p;
    // If an explicit file is given, look it up
    if (p.endsWith('.md')) {
        try {
            _p = path.join(dir, p);
            stats = await stat(_p);
            if (stats.isFile()) return _p;
            else return false;
        } catch (e) {
            return false;
        }
    }

    // `p` could be a directory or file
    // Try looking up `p` + '.md'
    try {
        _p = path.join(dir, `${p}.md`);
        stats = await stat(_p);
        if (stats.isFile()) return _p;
    } catch {}

    // Try looking up p as directory
    try {
        _p = path.join(dir, p, 'index.md');
        stats = await stat(_p);
        if (stats.isFile()) return _p;
        else return false;
    } catch {
        return false;
    }
};


export const directoryTree = (base: string, prefix = '') => {
    const rel = (c: any) => {
        c.path = `${prefix}/${path.relative(base, c.path)}`.replace('.md', '');
        c.title = startCase(c.name);
        delete c.name;
        delete c.size;
        return c;
    };

    const tree = dt(base, {extensions: /\.md/, exclude: /\/index\.md/}, (item: any) => {
        // tslint:disable-next-line no-magic-numbers
        item.name = item.name.slice(0, -3);
        delete item.extension;
        rel(item);
    });

    rel(tree);

    const map = (obj: any) => {
        if (obj.children) {
            obj.children
                .filter((c: any) => c.type === 'directory')
                .map(rel)
                .forEach(map);
        }
    };
    map(tree);
    return tree;
};
