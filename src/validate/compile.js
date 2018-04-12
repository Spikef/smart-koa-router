var Rav = require('open-args');
var spec = require('../docs/template');
var placer = require('./index')().name;

module.exports = function(options) {
    return function compileValidate(routes) {
        var rav = new Rav(spec);
        routes.forEach(function(route) {
            if (route.type === route.TYPES.UPLOAD || route.type === route.TYPES.DEFINE) {
                for (let i = 0; i < route.stack.length; i++) {
                    let middleware = route.stack[i];
                    if (middleware.name === placer) {
                        if (options === false) {
                            route.stack.splice(i, 1);
                        } else {
                            let { method, path } = middleware();
                            route.stack[i] = createMiddleware(rav, method, path, options);
                            middleware = null;
                        }

                        break;
                    }
                }
            }
        });
    }
};

/**
 * create middleware
 * @param rav
 * @param method
 * @param path
 * @param options
 */
function createMiddleware(rav, method, path, options) {
    var uid = rav.hashKey(method, path);
    var onerror;
    if (options && options.onerror && typeof options.onerror === 'function') {
        onerror = options.onerror;
    }
    var headers = [], operation;
    if (operation = spec.paths[path][method]) {
        operation.parameters.forEach(p => {
            if (p.in === 'header') {
                headers.push({
                    name: p.name,
                    lower: p.name.toLowerCase()
                });
            }
        });
    }
    return async function validateMiddleware(ctx, next) {
        var header = {};
        headers.forEach(function(h) {
            header[h.name] = ctx.header[h.lower];
        });

        var data = {
            body: ctx.req.body,
            query: ctx.query,
            params: ctx.params,
            header: header,
        };

        var result = rav.validate(uid, data);
        if (result === true) {
            headers.forEach(function(h) {
                ctx.header[h.lower] = header[h.name];
            });
            await next();
        } else if (onerror) {
            onerror.call(ctx, result);
        } else {
            ctx.status = 400;
            ctx.body = result;
        }
    }
}
