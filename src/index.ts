import {Route} from 'origami-core-lib';
import Server from 'origami-core-server';
import path from 'path';
import mwCache from './middleware/cache';
import getData from './middleware/getData';
import render from './middleware/render';

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


const DEFAULT_CSS_HREF = '/docs/docs.css';


module.exports = (app: Server, options = {}) => {
    settings = {...DEFAULT_OPTIONS, ...options};

    // Statically host the public directory
    app.static(path.resolve(__dirname, '../public'), settings.prefix);


    const r = new Route(`${settings.prefix}/*`)
        // If the /xyz?nocache query string is present, clear the cache for that URL
        .position('pre-store')
        .get(mwCache())

        // Attempts to lookup an article in the docs folder, and stores to the response
        .position('store')
        .get(getData(settings))

        // If there is an article in the response.data, render it or pass off to origami-app-theme
        .position('render').get(render(settings));


    // If there's a path to a custom css file given, host it statically
    if (settings.cssFile && !settings.cssHREF) {
        const cssRoute = new Route(DEFAULT_CSS_HREF)
            .position('pre-send')
            .get((req, res) => res.sendFile(settings.cssFile!));
        app.useRouter(cssRoute);
    }


    app.useRouter(r);
};
