import { Renderer, warn } from '@origami/core';
import MarkdownIt from 'markdown-it';
// @ts-ignore
import markdownItAttrs from 'markdown-it-attrs';
// @ts-ignore
import markdownItContainer from 'markdown-it-container';
// @ts-ignore
import markdownFrontMatter from 'markdown-it-front-matter';
// @ts-ignore
import markdownItNamedHeaders from 'markdown-it-named-headers';
// @ts-ignore
import toc from 'markdown-toc';
import path from 'path';
import { MarkdownDocsSettings } from '../../../..';
import { FrontMatterData } from '../../../../middleware/getData';
import { DocPage } from '../DocPage';

const TEMPLATE = path.resolve(
  __dirname,
  '../../../../../templates/templates/article.pug'
);

const renderer = new Renderer();

export class DocArticle extends DocPage {
  protected async _parse(source: string, settings: MarkdownDocsSettings) {
    let fmData: FrontMatterData = {};
    const markdown = new MarkdownIt();

    markdown.use(markdownItAttrs);
    markdown.use(markdownItNamedHeaders);
    markdown.use(markdownFrontMatter, (fm: any) => {
      try {
        fmData = JSON.parse(fm);
      } catch (e) {
        // warn('MarkdownDocs', `Document ${file} has an invalid JSON header`);
        warn('MarkdownDocs', `Document has an invalid JSON header`);
      }
    });
    markdown.use(markdownItContainer, 'subtitle');

    const html = markdown.render(source);

    // Set the Table of Contents from the markdown
    let headings: object[] | false = toc(source).json;
    const originalTitle = this.title;
    if (!(headings as object[]).length) headings = false;

    let prevPage;
    let nextPage;
    if (typeof fmData.prev === 'string') {
      prevPage = await this.tree.lookupItem(fmData.prev);
    }
    if (typeof fmData.next === 'string') {
      nextPage = await this.tree.lookupItem(fmData.next);
    }


    return {
      title:
        headings && headings[0]
          ? // @ts-ignore
            headings[0].content
          : originalTitle,
      body: html,
      headings,
      prevPage,
      nextPage,

      // Extend with data from front matter header
      ...fmData
    };
  }

  protected async _render(data: object) {
    let page = await renderer.render(TEMPLATE, { data });

    // Hack for adding Prism.js' .command-line class to all bash
    // <pre>'s and <code>'s
    page = page.replace(
      /class="\s*language-bash"/gm,
      'class="command-line language-bash"'
    );

    return page;
  }
}
