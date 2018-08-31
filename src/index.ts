import fs from 'fs';
import marked from 'marked';
import { Renderer, Route } from 'origami-core-lib';
import Server from 'origami-core-server';
import path from 'path';
import { promisify } from 'util';
import { directoryTree, lookupFile } from './lib';
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
}

let settings: MarkdownDocsSettings;

const DEFAULT_OPTIONS: MarkdownDocsSettings = {
    prefix: '/docs',
    directory: path.resolve(process.cwd(), 'docs'),
    themeTemplate: false,
    cssFile: path.resolve(__dirname, './docs.css'),
    sidebarSkipRoot: true,
    siteTitle: 'Documentation'
};


const renderer = new Renderer();
const TEMPLATE = path.resolve(__dirname, '../templates/article.pug');
const DEFAULT_CSS_HREF = '/docs/docs.css';


const CACHE: { [url: string]: string | false } = {};


module.exports = (app: Server, options = {}) => {
    settings = {...DEFAULT_OPTIONS, ...options};

    const r = new Route(`${settings.prefix}/*`);


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
                    logo: settings.logo
                };

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
            let cachedPage = CACHE[url];


            // Handle with origami-app-theme
            if (!cachedPage && (res.headersSent || res.isPage || !res.data || !res.data.body)) {
                return next();
            }

            if (!cachedPage) {
                cachedPage = CACHE[url] = await renderer.render(TEMPLATE, {data: res.data}) as string;
            }

            if (cachedPage) res.body = cachedPage as string;
            next();
        });

    if (settings.cssFile && !settings.cssHREF) {
        const cssRoute = new Route(DEFAULT_CSS_HREF)
            .position('pre-send')
            .get((req, res) => res.sendFile(settings.cssFile));
        app.useRouter(cssRoute);
    }


    app.useRouter(r);

    app.static(path.resolve(__dirname, '../public'), settings.prefix);
};
