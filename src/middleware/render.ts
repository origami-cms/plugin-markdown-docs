import {MarkdownDocsSettings} from '..';
import {Origami, Renderer} from 'origami-core-lib';
import {parse} from 'url';
import path from 'path';
import {DocTree} from '../lib/DocTree';

const TEMPLATE = path.resolve(__dirname, '../../templates/article.pug');
const renderer = new Renderer();

export default (settings: MarkdownDocsSettings, tree: DocTree): Origami.Server.RequestHandler =>
    async (req, res, next) => {
        try {
            const url = parse(req.originalUrl).pathname!;
            let page = tree.fromPageCache(url);


            // Handle with origami-app-theme
            if (!
                page &&
                // @ts-ignore
                (res.headersSent || res.isPage || !res.data || res.data.body === undefined)) {
                return next();
            }

            if (!page || settings.cache === false) {
                page = await renderer.render(TEMPLATE, { data: res.data }) as string;

                // Hack for adding Prism.js' .command-line class to all bash
                // <pre>'s and <code>'s
                page = page.replace(
                    /class="\s*language-bash"/gm, 'class="command-line language-bash"'
                );

                if (settings.cache) tree.setInPageCache(url, page);
            }

            if (page) res.body = page as string;
            next();
        } catch (e) {
            next(e);
        }
    };
