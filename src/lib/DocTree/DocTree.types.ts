export interface DocTreeOptions {
  include: DocTreeIncludeItem[];
  prefix?: string;
}

export type DocTreeIncludeItem = {
  type: DocTreeIncludeType;
  path: string;
  title?: string;
};

export type DocTreeIncludeType =
  | 'tutorials'
  | 'topics'
  | 'guides'
  | 'examples'
  | 'plugins'
  | 'apiReference';

export type Tree<T> = { [type in DocTreeIncludeType]: T };
