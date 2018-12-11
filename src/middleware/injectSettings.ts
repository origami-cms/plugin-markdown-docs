import { Origami } from '@origami/core';
import { parse } from 'url';
import { MarkdownDocsSettings } from '..';
import { DocTree } from '../lib/DocTree/DocTree';

const DEFAULT_CSS_HREF = '/docs/docs.css';

export const injectSettings = (
  settings: MarkdownDocsSettings,
  tree: DocTree
): Origami.Server.RequestHandler => async (req, res, next) => {
  const url = parse(req.originalUrl).pathname!;

  // Default data to use on all templates
  res.locals.docsData = {
    url,
    tree: tree.docs,
    css: settings.cssHREF || DEFAULT_CSS_HREF,
    siteTitle: settings.siteTitle,
    sidebarSkipRoot: settings.sidebarSkipRoot,
    logo: settings.logo,
    colors: settings.colors,
    docsRoot: settings.prefix
  };
  next();
};
