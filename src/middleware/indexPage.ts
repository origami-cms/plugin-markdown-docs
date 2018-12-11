import { Origami, Renderer } from '@origami/core';
import path from 'path';
import { MarkdownDocsSettings } from '..';
import { DocTree } from '../lib/DocTree/DocTree';

const renderer = new Renderer();

export const indexPage = (
  settings: MarkdownDocsSettings,
  tree: DocTree
): Origami.Server.RequestHandler => async (req, res, next) => {
  try {
    res.locals.content.set(
      await renderer.render(
        path.resolve(__dirname, '../../templates/templates/index.pug'),
        {
          data: {
            ...res.locals.docsData
          }
        }
      )
    );

    next();
  } catch (e) {
    next(e);
  }
};
