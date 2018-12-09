import {MarkdownDocsSettings} from '..';
import {Origami} from 'origami-core-lib';
import {DocTree} from '../lib/DocTree';

export default (settings: MarkdownDocsSettings, tree: DocTree): Origami.Server.RequestHandler =>
    async(req, res, next) => {
        res.data = await tree.search(req.query.q);

        next();
    };
