import fs from 'fs';
import marked from 'marked';
import { Renderer, Route } from 'origami-core-lib';
import Server from 'origami-core-server';
import path from 'path';
import { promisify } from 'util';
import { directoryTree, lookupFile } from './lib';
// @ts-ignore
import toc from 'markdown-toc';
import {parse} from 'url';


const markdown = promisify(marked);
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
                const md = (await fsRead(file)).toString();
                // @ts-ignore
                const body = await markdown(md);
                const headings: object = toc(md).json;

                res.data = {
                    body,
                    tree,
                    css: settings.cssHREF || DEFAULT_CSS_HREF,
                    headings,
                    url,
                    siteTitle: settings.siteTitle,
                    sidebarSkipRoot: settings.sidebarSkipRoot,
                    logo: settings.logo,
                    colors: settings.colors
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
            const url = parse(req.originalUrl).pathname!;
            let page = CACHE[url];


            // Handle with origami-app-theme
            // @ts-ignore
            if (!page && (res.headersSent || res.isPage || !res.data || !res.data.body)) {
                return next();
            }

            if (!page || settings.cache === false) {
                page = await renderer.render(TEMPLATE, {data: res.data}) as string;
                if (settings.cache) CACHE[url] = page;
            }

            if (page) res.body = page as string;
            next();
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