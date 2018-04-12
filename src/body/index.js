var debug = require('debug')('body');
var rawBody = require('raw-body');
var queryString = require('querystring');

var BODY_TYPES = Object.freeze({
    JSON: 'json',
    FORM: 'form'
});

var defaultOptions = Object.freeze({
    encoding: 'utf8',
    jsonLimit: '2mb',
    formLimit: '56kb',
    jsonFormats: ['application/json'],
    formFormats: ['application/x-www-form-urlencoded'],
    onerror: () => {}
});

module.exports = function bodyParser(options) {
    options = Object.assign({}, defaultOptions, options);
    debug('options: %o', options);

    var onerror;
    if (options.onerror && typeof options.onerror === 'function') {
        onerror = options.onerror;
    }

    return async function bodyParserMiddleware(ctx, next) {
        var body;
        var hits;
        var opts = { encoding: options.encoding };
        var type = ctx.headers['content-type'];
        var length = ctx.headers['content-length'];
        var encoding = ctx.headers['content-encoding'];

        if (!type) return await next();
        if (length && !encoding) opts.length = ~~length;

        if (!hits) {
            for (let i = 0; i < options.jsonFormats.length; i++) {
                if (~type.indexOf(options.jsonFormats[i])) {
                    hits = BODY_TYPES.JSON;
                    opts.limit = options.jsonLimit;
                    break;
                }
            }
        }

        if (!hits) {
            for (let i = 0; i < options.formFormats.length; i++) {
                if (~type.indexOf(options.formFormats[i])) {
                    hits = BODY_TYPES.FORM;
                    opts.limit = options.formLimit;
                    break;
                }
            }
        }

        if (!hits) return await next();

        try {
            body = await rawBody(ctx.req, opts);

            if (hits === BODY_TYPES.JSON) {
                body = JSON.parse(body);
            } else if (hits === BODY_TYPES.FORM) {
                body = queryString.parse(body);
                ctx.req.form = ctx.request.form = body;
            }

            ctx.req.body = ctx.request.body = body;
        } catch(err) {
            if (onerror) {
                onerror.call(ctx, err);
            } else {
                ctx.status = 400;
                ctx.body = {
                    code: 400500,
                    message: 'Can\'t parse request body'
                }
            }
        }

        await next();
    }
};
