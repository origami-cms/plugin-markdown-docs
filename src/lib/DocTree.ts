const fs = require('fs');
const path = require('path');
const dt = require('directory-tree');
const { startCase } = require('lodash');
const { promisify } = require('util');
const stat = promisify(fs.stat);
const fsRead = promisify(fs.readFile);

import MarkdownIt from 'markdown-it';
// @ts-ignore
import markdownItAttrs from 'markdown-it-attrs';
// @ts-ignore
import markdownItContainer from 'markdown-it-container';
// @ts-ignore
import markdownFrontMatter from 'markdown-it-front-matter';
// @ts-ignore
import markdownItNamedHeaders from 'markdown-it-named-headers';
import { FrontMatterData } from '../middleware/getData';
import { warn } from 'origami-core-lib';
import lunr from 'lunr';

export interface TreeItem {
  name: string;
  title: string;
  path: string;
  filePath: string;
  children: TreeItem[];
}
export interface Tree extends TreeItem {}

export interface RenderResult {
  html: string;
  fmData: FrontMatterData;
}

export interface DocMarkdownCache {
  [path: string]: RenderResult | false;
}

export interface DocReadCache {
  [path: string]: string;
}

export interface DocPageCache {
  [url: string]: string;
}

export class DocTree {
  tree?: Tree;

  private _readPromises: { [file: string]: Promise<string> } = {};
  private _readCache: DocReadCache = {};
  private _markdownCache: DocMarkdownCache = {};
  private _pageCache: DocPageCache = {};

  constructor(public directory: string, public prefix: string = '') {
    this._buildTree();
    this._buildReadCache();
  }

  // Reads a file from the cache, the current reading promise, or by creating
  // a new reading promise that will cache
  async read(file: string, useCache: boolean = true): Promise<string> {
    const f = await this._sanitizeFilePath(file);
    if (!f) throw new Error(`File ${file} does not exist`);

    // If the file is already read, and using a cache, return it
    if (this._readCache[f] && useCache) return this._readCache[f];

    // If the file is currently being read and using cache, return the promise
    if (this._readPromises[f] && useCache) return this._readPromises[f];

    // File has never been read OR not using cache
    return (this._readPromises[f] = new Promise(async res => {
      const data = (await fsRead(f)).toString();
      // Cache the read file
      this._readCache[f] = data;
      res(data);
    }));
  }

  async search(query: string) {
    if (!query) return [];

    const data = await Promise.all(
      Object.entries(this._readPromises).map(async ([file, prom]) => {
        const markdown = await prom;
        const item = (await this.lookupItem(file)) as TreeItem;
        return { path: item.path, item, markdown };
      })
    );

    const idx = lunr(function () {
      this.ref('path');
      this.field('markdown');
      this.metadataWhitelist = ['position'];
      data.forEach(d => this.add(d));
    });

    return idx.search(query).map(res => {
      const item = data.find(d => d.path === res.ref)!;
      return {
        url: item.path,
        title: item.item.title
      };
    });
  }

  fromPageCache(url: string) {
    return this._pageCache[url];
  }

  setInPageCache(url: string, data: string) {
    this._pageCache[url] = data;
  }

  clearCache() {
    this._pageCache = {};
    this._markdownCache = {};
    this._readCache = {};
    this._readPromises = {};
  }

  // Render the markdown file and cache the result and the FrontMatter data in
  // the _renderCache
  async renderMarkdown(
    file: string,
    useCache: boolean = true
  ): Promise<RenderResult | false> {
    const f = await this._sanitizeFilePath(file);
    if (!f) return false;

    // If the file is already rendered and using cache, return from cache
    if (this._markdownCache[file] && useCache) {
      return this._markdownCache[file] as RenderResult;
    }

    const md = await this.read(f);

    let fmData: FrontMatterData = {};
    const markdown = new MarkdownIt();

    markdown.use(markdownItAttrs);
    markdown.use(markdownItNamedHeaders);
    markdown.use(markdownFrontMatter, (fm: any) => {
      try {
        fmData = JSON.parse(fm);
      } catch (e) {
        // warn('MarkdownDocs', `Document ${file} has an invalid JSON header`);
        warn('MarkdownDocs', `Document has an invalid JSON header`);
      }
    });
    markdown.use(markdownItContainer, 'subtitle');

    const html = await markdown.render(md);

    const result = { fmData, html };
    this._markdownCache[file] = result;

    return result;
  }

  // Lookup node from the tree via the path
  async lookupItem(p: string): Promise<TreeItem | false> {
    if (!this.tree) return false;

    let _path = await this._sanitizeFilePath(p);
    if (!_path) return false;

    _path = path.relative(this.directory, _path);
    if (_path.endsWith('.md')) _path = _path.slice(0, -3);
    const _p = _path.split('/');

    let cur: string | undefined;
    let nextPage: TreeItem | undefined = this.tree;
    while ((cur = _p.shift()) && nextPage && nextPage.children) {
      nextPage = nextPage.children.find((c: any) => c.name === cur);
    }
    return nextPage || false;
  }

  // Returns a valid file path or false if not found
  private async _sanitizeFilePath(p: string) {
    let stats;
    let _p;

    let [, relPath] = p.split(this.prefix);
    if (!relPath) relPath = p;

    // If an explicit file is given, look it up
    if (relPath.endsWith('.md')) {
      try {
        _p = path.join(this.directory, relPath);
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
      _p = path.join(this.directory, `${relPath}.md`);
      stats = await stat(_p);
      if (stats.isFile()) return _p;
    } catch {
      /* Is a directory */
    }

    // Try looking up p as directory
    try {
      _p = path.join(this.directory, relPath, 'index.md');
      stats = await stat(_p);
      if (stats.isFile()) return _p;
      else return false;
    } catch {
      return false;
    }
  }

  private _buildTree() {
    const parse = (c: any) => {
      c.filePath = c.path;
      c.path = `${this.prefix}/${path.relative(
        this.directory,
        c.path
      )}`.replace('.md', '');
      c.title = startCase(c.name);
      // delete c.name;
      delete c.size;
      return c;
    };

    const tree = dt(
      this.directory,
      {
        extensions: /\.md/,
        exclude: /\/index\.md/
      },
      (item: any) => {
        // tslint:disable-next-line no-magic-numbers
        item.name = item.name.slice(0, -3);
        delete item.extension;
        parse(item);
      }
    );

    parse(tree);

    const map = (obj: any) => {
      if (obj.children) {
        obj.children
          .filter((c: any) => c.type === 'directory')
          .map(parse)
          .forEach(map);
      }
    };
    map(tree);

    this.tree = tree;
  }

  private async _buildReadCache() {
    if (!this.tree) return false;

    const build = async (item: TreeItem) => {
      const f = await this._sanitizeFilePath(item.path);
      if (f) this.read(f);

      if (item.children) item.children.map(build.bind(this));
    };

    await build(this.tree);
  }
}
