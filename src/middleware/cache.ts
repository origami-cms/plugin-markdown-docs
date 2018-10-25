import {Origami} from 'origami-core-lib';
import {parse} from 'url';

export const CACHE: { [url: string]: string | false } = {};

export default (): Origami.Server.RequestHandler => (req, res, next) => {
    if (req.query.nocache !== undefined) {
        CACHE[parse(req.originalUrl).pathname!] = false;
    }
    next();
};
