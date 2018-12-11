import { Renderer } from '@origami/core';
import path from 'path';
import { DocPage } from '../DocPage';

const TEMPLATE = path.resolve(
  __dirname,
  '../../../../../templates/templates/apiReference.pug'
);
const renderer = new Renderer();

export class DocAPIReference extends DocPage {
  protected async _parse(source: string) {
    const data = JSON.parse(source);
    const returning = { data };

    const classes = data.children.filter(
      (c: any) => c.kindString === 'Class' && !c.name.startsWith('Error')
    );
    const errors = data.children.filter(
      (c: any) => c.kindString === 'Class' && c.name.startsWith('Error')
    );
    const methods = data.children.filter(
      (c: any) => c.kindString === 'Function'
    );

    const headings = [];

    if (classes.length) {
      headings.push({
        content: 'Classes',
        slug: 'classes',
        lvl: 2,
        i: 0,
        children: classes.map((c, i) => ({
          content: c.name,
          slug: c.name,
          lvl: 3,
          i,
          type: 'class'
        }))
      });
    }

    if (methods.length) {
      headings.push({
        content: 'Functions',
        slug: 'functions',
        lvl: 2,
        i: 1,
        children: methods.map((c, i) => ({
          content: c.name,
          slug: c.name,
          lvl: 3,
          i,
          type: 'method'
        }))
      });
    }

    if (errors.length) {
      headings.push({
        content: 'Errors',
        slug: 'errors',
        lvl: 2,
        i: 2,
        children: errors.map((c, i) => ({
          content: c.name,
          slug: c.name,
          lvl: 3,
          i,
          type: 'error'
        }))
      });
    }

    returning.headings = headings;

    return returning;
  }

  protected async _render(data: object) {
    return renderer.render(TEMPLATE, { data });
  }
}
