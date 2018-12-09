import {Origami} from '@origami/core';
import {DocTree} from '../lib/DocTree';

export const cache = (tree: DocTree): Origami.Server.RequestHandler => (
  req,
  res,
  next
) => {
  if (req.query.nocache !== undefined) {
    tree.clearCache();
  }
  next();
};
