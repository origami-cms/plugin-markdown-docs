import { Origami, Renderer } from '@origami/core';
import path from 'path';
import { parse } from 'url';
import { MarkdownDocsSettings } from '..';
import { DocTree } from '../lib/DocTree';

const TEMPLATE = path.resolve(__dirname, '../../templates/article.pug');
const renderer = new Renderer();

export const render = (
  settings: MarkdownDocsSettings,
  tree: DocTree
): Origami.Server.RequestHandler => async (req, res, next) => {
  try {
    const url = parse(req.originalUrl).pathname!;
    let page = tree.fromPageCache(url);
    const data = res.locals.content.get();

    // Handle with origami-app-theme
    if (!page && (res.headersSent || res.locals.isPage || !data)) {
      next();
      return;
    }

    if (!page || settings.cache === false) {
      page = (await renderer.render(TEMPLATE, { data })) as string;

      // Hack for adding Prism.js' .command-line class to all bash
      // <pre>'s and <code>'s
      page = page.replace(
        /class="\s*language-bash"/gm,
        'class="command-line language-bash"'
      );

      if (settings.cache) tree.setInPageCache(url, page);
    }

    if (page) {
      res.locals.content.clear();
      res.locals.content.set(page);
    }
    next();
  } catch (e) {
    next(e);
  }
};
