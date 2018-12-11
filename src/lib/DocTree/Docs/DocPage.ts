import fs from 'fs';
import { promisify } from 'util';
import { DocTree } from '../DocTree';
import { Doc } from './Doc';

const fsRead = promisify(fs.readFile);

export interface DocPageReadResult {
  source: string;
  parsed: any;
}

export class DocPage extends Doc {
  public parent?: Doc;
  public rendered: boolean = false;
  public source: Promise<string>;
  public cache: string | null = null;

  private _file: string;
  private _readCache: string | null = null;
  private _parsedCache: DocPageReadResult | null = null;

  constructor(
    title: string,
    path: string,
    file: string,
    tree: DocTree,
    parent?: Doc
  ) {
    super(title, path, tree);
    this._file = file;
    if (parent) this.parent = parent;

    // Pre-read the source file
    this.source = this._read();
  }

  get path(): string {
    return `${this.parent ? this.parent.path : ''}/${this._path}`;
  }

  public async parse(options?: object, cache: boolean = true): Promise<DocPageReadResult> {
    if (this._parsedCache && cache) return this._parsedCache;
    // Read the raw file as a string...
    const source = await this._read(cache);
    // Parse it through the parser to get a DocPageReadResult
    this._parsedCache = {
      source,
      parsed: await this._parse(source, options)
    };
    return this._parsedCache;
  }

  public async render(data: any, cache: boolean = true): Promise<string> {
    if (this.rendered && cache) return this.cache!;
    this.cache = await this._render(data);
    this.rendered = true;
    return this.cache;
  }

  public addChild(node: DocPage): DocPage {
    node.parent = this;
    this.children.push(node);
    return node;
  }

  public clearCache() {
    this._readCache = null;
    this._parsedCache = null;
    this.cache = null;
    this.rendered = false;
  }

  protected async _read(cache: boolean = true): Promise<string> {
    if (this._readCache && cache) return this._readCache;
    return (this._readCache = (await fsRead(this._file)).toString());
  }

  protected async _parse(source: string, options?: object): Promise<any> {
    throw new Error(`DocPage: _parse Not implemented for ${this.title}`);
  }

  protected async _render(data: object): Promise<any> {
    throw new Error(`DocPage: _render Not implemented for ${this.title}`);
  }
}
