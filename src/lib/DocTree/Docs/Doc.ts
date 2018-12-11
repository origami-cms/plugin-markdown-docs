import { DocTree } from '../DocTree';
import { DocPage as DocumentPage } from './DocPage';

export class Doc {
  public title: string;
  public children: DocumentPage[] = [];
  public tree: DocTree;

  protected _path: string;

  constructor(title: string, path: string, tree: DocTree) {
    this.title = title;
    this.tree = tree;
    this._path = path;
  }

  get path(): string {
    return this._path;
  }

  public addChild(node: DocumentPage): DocumentPage {
    node.parent = this;
    this.children.push(node);
    return node;
  }
}
