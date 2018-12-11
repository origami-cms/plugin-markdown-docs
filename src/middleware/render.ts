import { Origami } from '@origami/core';
import { MarkdownDocsSettings } from '..';
import { DocPage } from '../lib/DocTree/Docs/DocPage';
import { DocTree } from '../lib/DocTree/DocTree';

export const render = (
  settings: MarkdownDocsSettings,
  tree: DocTree
): Origami.Server.RequestHandler => async (req, res, next) => {
  try {
    const data = res.locals.content.get() as any;
    const doc = data.currentDoc as DocPage;


    if (doc && doc.rendered && !data) {
      res.locals.content.set(doc.cache!);
      next();
      return;
    }

    // Handle with origami-app-theme
    if (res.headersSent || res.locals.isPage || !data || !doc) {
      next();
      return;
    }

    let renderResult;
    renderResult = await doc.render(data || {}, settings.cache);

    if (renderResult) {
      res.locals.content.clear();
      // res.contentType('html');
      res.locals.content.set(renderResult);
    }

    next();
  } catch (e) {
    next(e);
  }
};
