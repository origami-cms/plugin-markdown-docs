import { Route, Server } from '@origami/core';
import path from 'path';
import { DocTree } from './lib/DocTree/DocTree';
import { DocTreeIncludeItem } from './lib/DocTree/DocTree.types';
import { cache as mwCache } from './middleware/cache';
import { getData } from './middleware/getData';
import { indexPage } from './middleware/indexPage';
import { injectSettings } from './middleware/injectSettings';
import { render } from './middleware/render';
import { search } from './middleware/search';

export interface MarkdownDocsSettings {
  include: DocTreeIncludeItem[];
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

const DEFAULT_OPTIONS: Partial<MarkdownDocsSettings> = {
  prefix: '/docs',
  themeTemplate: false,
  cssFile: path.resolve(__dirname, './docs.css'),
  sidebarSkipRoot: true,
  siteTitle: 'Documentation',
  cache: true
};
const DEFAULT_CSS_HREF = '/docs/docs.css';

module.exports = async (app: Server, options = {}) => {
  settings = { ...DEFAULT_OPTIONS, ...options };

  const tree = new DocTree({
    include: settings.include,
    prefix: settings.prefix
  });
  await tree.setup();

  // If there's a path to a custom css file given, host it statically
  if (settings.cssFile && !settings.cssHREF) {
    const cssRoute = new Route(DEFAULT_CSS_HREF)
      .position('pre-send')
      .get((req, res) => res.sendFile(settings.cssFile!));
    app.useRouter(cssRoute);
  }

  // Inject the settings and data into all doc routes
  app.useRouter(
    new Route(new RegExp(`^${settings.prefix}`))
    // new Route(`${settings.prefix}/*`)
      .position('init')
      .use(injectSettings(settings, tree))

      // Attempts to lookup an article in the docs folder, and stores to the response
      .position('store')
      .get(getData(settings, tree))
  );

  // Render the index page
  app.useRouter(
    new Route(`${settings.prefix}`)
      .position('render')
      .get(indexPage(settings, tree))
  );

  // Statically host the public directory
  // @ts-ignore
  app.static(
    path.resolve(__dirname, '../public'),
    settings.prefix,
    'post-render'
  );

  // Render the doc pages
  app.useRouter(
    new Route(`${settings.prefix}/*`)
      // If the /xyz?nocache query string is present, clear the cache for that URL
      .position('pre-store')
      .get(mwCache(tree))

      // If there is an article in the response.data, render it or pass off to origami-app-theme
      .position('post-render')
      .get(render(settings, tree))
  );

  // Search route
  app.useRouter(new Route('/api/v1/docs/search').get(search(settings, tree)));
};
