import { Origami } from '@origami/core';
import { MarkdownDocsSettings } from '..';
import { DocTree } from '../lib/DocTree/DocTree';

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
  const {url} = res.locals.docsData;

  // Find the item in the DocTree docs
  const doc = tree.lookupItem(url);

  if (doc) res.locals.docsData.currentDoc = doc;

  // Attempt to load from cache...
  if (!doc || (doc && doc.rendered)) {
    // If skipping parsing, set the current doc data to content
    if (doc) {
      res.locals.content.set({
        ...res.locals.docsData
      });
    }
    next();
    return;
  }


  // Parse the file
  const parsed = await doc.parse(settings);

  // Render the markdown
  if (!parsed.parsed) {
    next();
    return;
  }

  // Used for origami-app-theme
  if (settings.themeTemplate) {
    res.locals.isPage = true;
    parsed.parsed.type = settings.themeTemplate;
  }

  res.locals.content.set({
    ...res.locals.docsData,
    ...parsed.parsed
  });

  next();
};
