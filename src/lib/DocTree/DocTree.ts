// @ts-ignore
import { colors } from '@origami/core';
import dt from 'directory-tree';
import fs, { Stats } from 'fs';
import _ from 'lodash';
import lunr from 'lunr';
import path from 'path';
import { promisify } from 'util';
import { Doc } from './Docs/Doc';
import { DocPage } from './Docs/DocPage';
import { DocAPIReference } from './Docs/DocTypes/DocAPIReference';
import { DocArticle } from './Docs/DocTypes/DocArticle';
import { DocSection } from './Docs/DocTypes/DocSection';
import {
  DocTreeIncludeItem,
  DocTreeIncludeType,
  DocTreeOptions,
  Tree
} from './DocTree.types';
const fsStat = promisify(fs.stat);

export class DocTree {
  public include: DocTreeIncludeItem[];
  public prefix?: string;

  public docs: Tree<Doc>;

  private docTypes: Tree<typeof DocPage> = {
    apiReference: DocAPIReference,
    examples: DocArticle,
    guides: DocArticle,
    plugins: DocArticle,
    topics: DocArticle,
    tutorials: DocArticle
  };

  private docTypeExtensions: Tree<RegExp> = {
    apiReference: /\.json/,
    examples: /\.md/,
    guides: /\.md/,
    plugins: /\.md/,
    topics: /\.md/,
    tutorials: /\.md/
  };

  constructor(options: DocTreeOptions) {
    this.include = options.include;
    this.prefix = options.prefix || '';

    this.docs = {
      apiReference: new DocSection('API Reference', `${this.prefix}/reference`, this),
      // examples: new DocSection('Examples', `${this.prefix}/examples`, this),
      // guides: new DocSection('Guides', `${this.prefix}/guides`, this),
      // plugins: new DocSection('Plugins', `${this.prefix}/plugins`, this),
      // topics: new DocSection('Topics', `${this.prefix}/topics`, this),
      tutorials: new DocSection('Tutorials', `${this.prefix}/tutorials`, this)
    };
  }

  public async setup() {
    this.include.forEach(async (include) => {
      const validTypes = [
        'tutorials',
        'topics',
        'guides',
        'examples',
        'plugins',
        'apiReference'
      ];
      if (!validTypes.includes(include.type)) {
        throw new Error(
          `MarkdownDocs: Include type '${colors.yellow(
            include.type
          )}' is not valid`
        );
      }
      // const DocType = this.types[include.type];
      // new DocType();
      const stat = (await fsStat(include.path)) as Stats;
      if (stat.isDirectory()) this._includeDirectory(include);
      else if (stat.isFile()) this._includeFile(include);
    });
  }

  public addChild(type: DocTreeIncludeType, doc: DocPage) {
    this.docs[type].addChild(doc);
  }

  public lookupItem(url: string): DocPage | false {
    // Remove the prefix when searching
    let _url = url;
    if (this.prefix && url.startsWith(this.prefix)) {
      _url = _url.slice(this.prefix.length);
    }

    const split = _url
      .split('/')
      // Remove empty strings from leading slash
      .filter((p) => p)
      .reverse();

    let curPath = split.pop();
    let curNode = Object.values(this.docs).find((d) =>
      d.path.startsWith(`${this.prefix}/${curPath}`)
    );

    if (!curNode) return false;

    // tslint:disable-next-line no-conditional-assignment
    while ((curPath = split.pop()) && curNode) {
      const nextNode = curNode.children.find(
        (c) => c.path.split('/').pop() === curPath
      ) as Doc | undefined;

      if (!nextNode) return false;
      else curNode = nextNode;
    }

    return curNode as DocPage;
  }

  public async search(query: string) {
    if (!query) return [];

    const data = await Promise.all(
      this._flatten().map(async (doc) => {
        const source = await doc.source;
        return { path: doc.path, doc, source };
      })
    );

    const idx = lunr(function() {
      this.ref('path');
      this.field('source');
      this.metadataWhitelist = ['position'];
      data.forEach((d) => this.add(d));
    });

    return idx.search(query).map((res) => {
      const item = data.find((d) => d.path === res.ref)!;
      return {
        url: item.path,
        title: item.doc.title
      };
    });
  }

  public clearCache() {
    this._flatten().forEach((d) => d.clearCache());
  }

  private _includeDirectory(include: DocTreeIncludeItem) {
    const type = this.docTypes[include.type];
    const tree = dt(
      include.path,
      {
        extensions: this.docTypeExtensions[include.type],
        exclude: /\/index\.md/
      },
      (item: any) => {
        // Remove extension from name
        item.name = item.name.slice(0, path.extname(item.name).length * -1);
        delete item.extension;
      }
    );

    const nest = (parent: Doc, treeItem: any) => {
      tree.children.forEach((c) => {
        const child = new type(_.startCase(c.name), c.name, c.path, this);
        parent.addChild(child);
      });
    };

    nest(this.docs[include.type], tree);
  }

  private _includeFile(include: DocTreeIncludeItem): DocPage {
    const type = this.docTypes[include.type];
    const title = _.startCase(
      include.title || include.path.split('/').slice(-2)[0]
    );

    this.docs[include.type].addChild(
      new type(title, _.kebabCase(title), include.path, this)
    );
  }

  private _flatten(doc?: Doc, list: DocPage[] = []): DocPage[] {
    if (!doc) {
      Object.values(this.docs).map((d) => {
        this._flatten(d, list);
      });
    } else {
      doc.children.forEach((c) => {
        list.push(c);
        this._flatten(c, list);
      });
    }

    return list;
  }
}
