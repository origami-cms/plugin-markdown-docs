import {Origami} from '@origami/core';
import {startCase} from 'lodash';
// @ts-ignore
import toc from 'markdown-toc';
import {parse} from 'url';
import {MarkdownDocsSettings} from '..';
import {DocTree} from '../lib/DocTree';

const DEFAULT_CSS_HREF = '/docs/docs.css';

export interface FrontMatterData {
  title?: string;
  prev?: string;
  next?: string;
}

// Loads the data from DocTree and assigns to response
export const getData = (
  settings: MarkdownDocsSettings,
  tree: DocTree
): Origami.Server.RequestHandler => async (req, res, next) => {
  // Attempt to load from cache...
  const url = parse(req.originalUrl).pathname!;
  if (tree.fromPageCache(url)) {
    next();
    return;
  }

  // Find the item in the DocTree items
  const item = await tree.lookupItem(url);
  if (!item) {
    next();
    return;
  }

  // Read the file
  const md = await tree.read(url);
  // Render the markdown
  const render = await tree.renderMarkdown(url);
  if (!render) {
    next();
    return;
  }
  const { fmData, html: body } = render;

  // Set the Table of Contents from the markdown
  let headings: object[] | false = toc(md).json;
  const originalTitle = startCase(item.title);
  if (!(headings as object[]).length) headings = false;

  let prevPage;
  let nextPage;
  if (typeof fmData.prev === 'string') {
    prevPage = await tree.lookupItem(fmData.prev);
  }
  if (typeof fmData.next === 'string') {
    nextPage = await tree.lookupItem(fmData.next);
  }

  const data = {
    title:
      headings && headings[0]
        // @ts-ignore
        ? headings[0].content
        : originalTitle,
    body,
    tree: tree.tree,
    css: settings.cssHREF || DEFAULT_CSS_HREF,
    headings,
    url,
    siteTitle: settings.siteTitle,
    sidebarSkipRoot: settings.sidebarSkipRoot,
    logo: settings.logo,
    colors: settings.colors,
    prevPage,
    nextPage,

    // Extend with data from front matter header
    ...fmData
  } as { [key: string]: any };

  // Used for origami-app-theme
  if (settings.themeTemplate) {
    res.locals.isPage = true;
    data.type = settings.themeTemplate;
  }

  res.locals.content.set(data);

  next();
};
