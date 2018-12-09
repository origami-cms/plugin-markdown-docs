import { Route, Server } from '@origami/core';
import path from 'path';
import { DocTree } from './lib/DocTree';
import { cache as mwCache } from './middleware/cache';
import { getData } from './middleware/getData';
import { render } from './middleware/render';
import { search } from './middleware/search';

export interface MarkdownDocsSettings {
  directory: string;
  prefix: string;
  themeTemplate?: string | false;
  cssFile?: string;
  cssHREF?: string;
  sidebarSkipRoot?: boolean;
  logo?: string;
  siteTitle?: string;
  cache?: boolean;
  colors?: { [color: string]: string };
}

let settings: MarkdownDocsSettings;

const DEFAULT_OPTIONS: MarkdownDocsSettings = {
  prefix: '/docs',
  directory: path.resolve(process.cwd(), 'docs'),
  themeTemplate: false,
  cssFile: path.resolve(__dirname, './docs.css'),
  sidebarSkipRoot: true,
  siteTitle: 'Documentation',
  cache: true
};
const DEFAULT_CSS_HREF = '/docs/docs.css';

module.exports = async(app: Server, options = {}) => {
  settings = { ...DEFAULT_OPTIONS, ...options };

  const tree = new DocTree(settings.directory, settings.prefix);
  await tree.setup();

  // Statically host the public directory
  app.static(path.resolve(__dirname, '../public'), settings.prefix);

  const r = new Route(`${settings.prefix}/*`)
    // If the /xyz?nocache query string is present, clear the cache for that URL
    .position('pre-store')
    .get(mwCache(tree))

    // Attempts to lookup an article in the docs folder, and stores to the response
    .position('store')
    .get(getData(settings, tree))

    // If there is an article in the response.data, render it or pass off to origami-app-theme
    .position('render')
    .get(render(settings, tree));

  // If there's a path to a custom css file given, host it statically
  if (settings.cssFile && !settings.cssHREF) {
    const cssRoute = new Route(DEFAULT_CSS_HREF)
      .position('pre-send')
      .get((req, res) => res.sendFile(settings.cssFile!));
    app.useRouter(cssRoute);
  }

  const searchRoute = new Route('/api/v1/docs/search').get(
    search(settings, tree)
  );

  app.useRouter(r);
  app.useRouter(searchRoute);
};
