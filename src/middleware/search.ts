import {Origami} from '@origami/core';
import {MarkdownDocsSettings} from '..';
import {DocTree} from '../lib/DocTree/DocTree';

export const search = (
  settings: MarkdownDocsSettings,
  tree: DocTree
): Origami.Server.RequestHandler => async (req, res, next) => {
  res.locals.content.set(await tree.search(req.query.q));

  next();
};
