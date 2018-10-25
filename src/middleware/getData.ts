import fs from 'fs';
import { startCase } from 'lodash';
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
import { Origami, warn } from 'origami-core-lib';
import { parse } from 'url';
import { promisify } from 'util';
import { MarkdownDocsSettings } from '..';
import { directoryTree, getNodeFromTree, lookupFile } from '../lib';
import { CACHE } from './cache';

const fsRead = promisify(fs.readFile);

const DEFAULT_CSS_HREF = '/docs/docs.css';


export interface FrontMatterData {
    title?: string;
    prev?: string;
    next?: string;
}


export default (settings: MarkdownDocsSettings): Origami.Server.RequestHandler =>
    async (req, res, next) => {
        const url = parse(req.originalUrl).pathname!;
        if (CACHE[url]) return next();

        const tree = directoryTree(settings.directory, settings.prefix);

        // Extract the file path
        const [, relPath] = url.split(settings.prefix);
        // Find the file in the docs folder
        const file = await lookupFile(relPath, settings.directory);


        if (file) {
            let fmData: FrontMatterData = {};

            const markdown = new MarkdownIt();
            markdown.use(markdownItAttrs);
            markdown.use(markdownItNamedHeaders);
            markdown.use(markdownFrontMatter, (fm: any) => {
                try {
                    fmData = JSON.parse(fm);

                } catch (e) {
                    warn('MarkdownDocs', `Document ${file} has an invalid JSON header`);
                }
            });
            markdown.use(markdownItContainer, 'subtitle');


            const md = (await fsRead(file)).toString();
            // @ts-ignore
            const body = await markdown.render(md);


            let headings: object[] | false = toc(md).json;
            const originalTitle = startCase(file.split('/').pop().slice(0, -3));
            if (!(headings as object[]).length) headings = false;

            let prevPage;
            let nextPage;
            if (typeof fmData.prev === 'string') prevPage = getNodeFromTree(fmData.prev, tree);
            if (typeof fmData.next === 'string') nextPage = getNodeFromTree(fmData.next, tree);


            res.data = {
                title: (headings && headings[0])
                    // @ts-ignore
                    ? headings[0].content
                    : originalTitle,
                body,
                tree,
                css: settings.cssHREF || DEFAULT_CSS_HREF,
                headings,
                url,
                siteTitle: settings.siteTitle,
                sidebarSkipRoot: settings.sidebarSkipRoot,
                logo: settings.logo,
                colors: settings.colors,
                prevPage,
                nextPage,

                // Extend with data from front matter header
                ...fmData
            } as { [key: string]: any };


            // Used for origami-app-theme
            if (settings.themeTemplate) {
                res.isPage = true;
                res.data.type = settings.themeTemplate;
            }

        }

        next();
    };
