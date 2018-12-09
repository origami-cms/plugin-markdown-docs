import {Origami} from 'origami-core-lib';
import {MarkdownDocsSettings} from '..';
import {DocTree} from '../lib/DocTree';

export const search = (
  settings: MarkdownDocsSettings,
  tree: DocTree
): Origami.Server.RequestHandler => async (req, res, next) => {
  res.data = await tree.search(req.query.q);

  next();
};
