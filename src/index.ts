import fs from 'fs';
import { startCase } from 'lodash';
import MarkdownIt from 'markdown-it';
// @ts-ignore
import markdownItAttrs from 'markdown-it-attrs';
// @ts-ignore
import markdownItContainer from 'markdown-it-container';
// @ts-ignore
import markdownItNamedHeaders from 'markdown-it-named-headers';
// @ts-ignore
import markdownFrontMatter from 'markdown-it-front-matter';
// @ts-ignore
import toc from 'markdown-toc';

import { Renderer, Route, warn } from 'origami-core-lib';
import Server from 'origami-core-server';
import path from 'path';
import { parse } from 'url';
import { promisify } from 'util';
import { directoryTree, lookupFile, getNodeFromTree } from './lib';

const fsRead = promisify(fs.readFile);

export interface MarkdownDocsSettings {
    directory: string;
    prefix: string;
    themeTemplate?: string | false;
    cssFile?: string;
    cssHREF?: string;
    sidebarSkipRoot?: boolean;
    logo?: string;
    siteTitle?: string;
    cache?: boolean;
    colors?: {[color: string]: string};
}

export interface FrontMatterData {
    title?: string;
    prev?: string;
    next?: string;
}

let settings: MarkdownDocsSettings;

const DEFAULT_OPTIONS: MarkdownDocsSettings = {
    prefix: '/docs',
    directory: path.resolve(process.cwd(), 'docs'),
    themeTemplate: false,
    cssFile: path.resolve(__dirname, './docs.css'),
    sidebarSkipRoot: true,
    siteTitle: 'Documentation',
    cache: true
};


const renderer = new Renderer();
const TEMPLATE = path.resolve(__dirname, '../templates/article.pug');
const DEFAULT_CSS_HREF = '/docs/docs.css';


const CACHE: { [url: string]: string | false } = {};


module.exports = (app: Server, options = {}) => {
    settings = {...DEFAULT_OPTIONS, ...options};

    // Statically host the public directory
    app.static(path.resolve(__dirname, '../public'), settings.prefix);


    const r = new Route(`${settings.prefix}/*`);


    // If the /xyz?nocache query string is present, clear the cache for that URL
    r.position('pre-store').get((req, res, next) => {
        if (req.query.nocache !== undefined) {
            CACHE[parse(req.originalUrl).pathname!] = false;
        }
        next();
    });


    // Attempts to lookup an article in the docs folder, and stores to the response
    r.position('store')
        .get(async (req, res, next) => {
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
                } as {[key: string]: any};


                // Used for origami-app-theme
                if (settings.themeTemplate) {
                    res.isPage = true;
                    res.data.type = settings.themeTemplate;
                }

            }

            next();
        });


    // If there is an article in the response.data, render it or pass off to origami-app-theme
    r
        .position('render')
        .get(async(req, res, next) => {
            try {
                const url = parse(req.originalUrl).pathname!;
                let page = CACHE[url];


                // Handle with origami-app-theme
                // @ts-ignore
                if (!page && (res.headersSent || res.isPage || !res.data || res.data.body === undefined)) {
                    return next();
                }

                if (!page || settings.cache === false) {
                    page = await renderer.render(TEMPLATE, {data: res.data}) as string;

                    // Hack for adding Prism.js's .command-line class to all bash
                    // <pre>'s and <code>'s
                    page = page.replace(/class="\s*language-bash"/gm, 'class="command-line language-bash"');

                    if (settings.cache) CACHE[url] = page;
                }

                if (page) res.body = page as string;
                next();
            } catch (e) {
                next(e);
            }
        });


    // If there's a path to a custom css file given, host it statically
    if (settings.cssFile && !settings.cssHREF) {
        const cssRoute = new Route(DEFAULT_CSS_HREF)
            .position('pre-send')
            .get((req, res) => res.sendFile(settings.cssFile!));
        app.useRouter(cssRoute);
    }


    app.useRouter(r);
};
