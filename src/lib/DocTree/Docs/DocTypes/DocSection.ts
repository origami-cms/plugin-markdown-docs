import { Renderer } from '@origami/core';
import path from 'path';
import { Doc } from '../Doc';

const TEMPLATE = path.resolve(
  __dirname,
  '../../../../../templates/templates/section.pug'
);
const renderer = new Renderer();

export class DocSection extends Doc {
  protected async parse(source: string) {
    return {parsed: true};
  }

  protected async render(data: object) {
    return renderer.render(TEMPLATE, { data });
  }
}
