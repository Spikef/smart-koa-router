var debug = require('debug')('static');
var path = require('path');
var send = require('koa-send');

var defaultOptions = Object.freeze({
    maxAge: 0,
    immutable: false,
    hidden: false,
    root: '.',
    index: null,
    gzip: true,
    brotli: true,
    format: true,
    setHeaders: null,
    extensions: null,
    filter: null,
    converter: null,
    mapList: null,
    onerror: () => {}
});

module.exports = function sendFile(options) {
    options = Object.assign({}, defaultOptions, options);

    debug('static root: %s', options.root);
    options.root = path.resolve(options.root);

    var filter, converter, onerror;
    if (options.filter && typeof options.filter === 'function') {
        filter = options.filter;
    } else if (options.include && options.include instanceof RegExp) {
        filter = v => options.include.test(v);
    } else if (options.exclude && options.exclude instanceof RegExp) {
        filter = v => !options.exclude.test(v);
    } else {
        filter = () => true;
    }
    if (options.filename) {
        converter = () => options.filename;
    } else if (options.converter && typeof options.converter === 'function') {
        converter = options.converter;
    } else if (options.mapList && Object.prototype.toString.call(options.mapList) === '[object Object]') {
        converter = v => options.mapList[v] || v;
    } else {
        converter = v => v;
    }
    if (options.onerror && typeof options.onerror === 'function') {
        onerror = options.onerror;
    }

    return async function sendFileMiddleware(ctx, next) {
        var filename = converter(ctx.params.filename);
        if (filename) {
            debug('static filename: %s', filename);
            try {
                if (filter(filename)) {
                    await send(ctx, filename, options);
                    if (options.continuous) await next();
                } else {
                    await next();
                }
            } catch (err) {
                if (onerror) {
                    onerror.call(ctx, err);
                } else {
                    throw err;
                }
            }
        } else if (options.index) {
            debug('static redirect: /%s', options.index);
            ctx.redirect(ctx.path + '/' + options.index);
        } else {
            await next();
        }
    }
};
