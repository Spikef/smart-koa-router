var EjsEngine = require('./engine/ejs-engine');

module.exports = function renderFile(options) {
    var Engine = options.engine || EjsEngine;
    var engine = new Engine(options.template);
    var onerror;
    if (options.onerror && typeof options.onerror === 'function') {
        onerror = options.onerror;
    }

    return async function renderFileMiddleware(ctx, next) {
        try {
            var html = await engine.render({
                req: ctx.request,
                data: Object.assign({}, options.data, ctx.data)
            });

            ctx.status = 200;
            ctx.type = 'text/html';
            ctx.body = html;
        } catch(err) {
            if (onerror) {
                onerror.call(ctx, err);
            } else {
                throw err;
            }
        }
    }
};
