var debug = require('debug')('Router');
var Route = require('./route');
var compose = require('koa-compose');
var doc =  require('../docs');
var prepares = {
    cors: require('../cors'),
    body: require('../body'),
    static: require('../static'),
    upload: require('../upload'),
    render: require('../render'),
    validate: require('../validate')
};

var compileValidate = require('../validate/compile');

var isReady = false;

var hooks = [];
var entries = [];
var routes = [];

var methods = Object.freeze([
    'HEAD',
    'OPTIONS',
    'GET',
    'PUT',
    'PATCH',
    'POST',
    'DELETE'
]);

var allowedRestfulMethods = Object.freeze([
    'get',
    'post',
    'put',
    'delete',
    'patch'
]);

class Router {
    /**
     * Router constructor
     * @param {Object} [options]
     * @param {String} [options.prefix]
     * @param {String|String[]} [options.methods]
     * @param {Object} [options.parseBody] - parse body
     * @param {String} [options.parseBody.encoding] - default: 'utf8'
     * @param {String} [options.parseBody.jsonLimit] - default: '2mb'
     * @param {String} [options.parseBody.formLimit] - default: '56kb'
     * @param {String} [options.parseBody.jsonFormats] - default: ['application/json']
     * @param {String} [options.parseBody.formFormats] - default: ['application/x-www-form-urlencoded']
     * @param {String} [options.parseBody.onerror] - parse error handler
     * @param {Object|Boolean} [options.allowCross] - cors
     * @param {*} [options.allowCross.origin] - default: '*'
     * @param {String|String[]} [options.allowCross.methods] - default: 'GET,HEAD,PUT,PATCH,POST,DELETE'
     * @param {Number} [options.allowCross.maxAge] - default: null
     * @param {Boolean} [options.allowCross.credentials] - default: false
     * @param {String|String[]} [options.allowCross.allowedHeaders] - default: null
     * @param {String|String[]} [options.allowCross.exposedHeaders] - default: null
     * @param {Number} [options.allowCross.optionsSuccessStatus] - default: 204
     * @param {Object} [options.staticFile] - static
     * @param {Number} [options.staticFile.maxAge] - default: 0
     * @param {Boolean} [options.staticFile.immutable] - default: false
     * @param {Boolean} [options.staticFile.hidden] - default: false
     * @param {Boolean} [options.staticFile.root] - default: '.'
     * @param {String} [options.staticFile.index] - default: null
     * @param {Boolean} [options.staticFile.gzip] - default: true
     * @param {Boolean} [options.staticFile.brotli] - default: true
     * @param {Boolean} [options.staticFile.format] - default: true
     * @param {Function} [options.staticFile.setHeaders] - default: null
     * @param {String[]} [options.staticFile.extensions] - default: null
     * @param {Function} [options.staticFile.filter] - default: true
     * @param {RegExp} [options.staticFile.include] - default: null
     * @param {RegExp} [options.staticFile.exclude] - default: null
     * @param {Function} [options.staticFile.converter] - default: null
     * @param {Function} [options.staticFile.mapList] - default: null
     * @param {Object} [options.staticFile.onerror] - static error handler
     * @param {Object} [options.uploadFile] - upload
     * @param {class} [options.uploadFile.storage] - the stream storage (Default: FileStorage when root is specified, MemoryStorage ether)
     * @param {String|String[]} [options.uploadFile.allowedFileExts] - the allowed file extensions (default: *)
     * @param {String|String[]} [options.uploadFile.allowedFileNames] - the allowed file input's name (default: *)
     * @param {String} [options.uploadFile.root] - the absolute path of the file saved directory
     * @param {Number} [options.uploadFile.mode] - directory mode for create root (default: 0777)
     * @param {Boolean} [options.uploadFile.multiple] -  allow input's multiple (default: false)
     * @param {Number} [options.uploadFile.fieldNameSize] - max field name size (in bytes) (default: 100 bytes)
     * @param {Number} [options.uploadFile.fieldValueSize] - max field value size (in bytes) (default: 1MB)
     * @param {Number} [options.uploadFile.fieldsCount] - max number of non-file fields (default: Infinity)
     * @param {Number} [options.uploadFile.fileSize] - for multipart forms, the max file size (in bytes) (default: 20480000=20MB)
     * @param {Number} [options.uploadFile.filesCount] - for multipart forms, the max number of file fields (default: Infinity)
     * @param {Number} [options.uploadFile.partsCount] - for multipart forms, the max number of parts (fields + files) (default: Infinity)
     * @param {Object} [options.renderFile] - render
     * @param {class} [options.renderFile.engine] - default: ejs
     * @param {Object} [options.renderFile.data] - extra data for renderer
     * @param {String} [options.renderFile.template] - template file path
     * @param {Object} [options.renderFile.onerror] - render error handler
     * @param {Object} [options.document] - swagger spec
     * @param {Object|Boolean} [options.swagger=true] - if use swagger
     * @param {String} [options.swagger.docApi] - default "/api-docs"
     * @param {String} [options.swagger.docUrl] - default "/swagger-ui.html"
     * @param {Object} [options.swagger.swaggerUi] - swaggerUi options
     * @param {String} [options.swagger.swaggerUi.home] - homepage, default: '/'
     * @param {String} [options.swagger.swaggerUi.title] - title, default: 'Swagger UI'
     * @param {String} [options.swagger.swaggerUi.pageTitle] - page title, default: 'Swagger'
     * @param {String} [options.swagger.swaggerUi.url] - default api url, default: '/api-docs'
     * @param {Object} [options.swagger.swaggerUi.auth] - swagger authorize, default: null
     * @param {Object|Boolean} [options.validator=true] - if use validator
     * @param {Function} [options.validator.onerror] - validator error handler
     */
    constructor(options = {}) {
        this.opts = {
            prefix: options.prefix || '/',
            methods: options.methods || methods,
            parseBody: options.parseBody,
            allowCross: options.allowCross,
            staticFile: options.staticFile,
            uploadFile: options.uploadFile,
            renderFile: options.renderFile,
            swagger: options.swagger,
            document: options.document,
            validator: options.validator,
        };

        if (typeof this.opts.methods === 'string') {
            this.opts.methods = this.opts.methods.split(',');
        }

        if (options.document) {
            doc.init(options.document);
        }
    }

    prefix(prefix) {
        this.opts.prefix = this._resolvePath(prefix);
        return this;
    }

    param(path, param, middleware) {
        var args = [...arguments];
        if (args.length === 2) {
            middleware = param;
            param = path;
            path = null;
        }
        var fn = function(ctx, next) {
            if (~ctx.routeOptions.params.indexOf(param)) {
                return middleware.call(this, ctx.params[param], ctx, next);
            }
            return next();
        };
        if (path) {
            return this.use(path, fn);
        } else {
            return this.use(fn);
        }
    }

    use(methods, path, opts, ...middleware) {
        var args = this._resolveArgs(...arguments);
        if (~args[0].indexOf('GET') && !~args[0].indexOf('HEAD')) args[0].unshift('HEAD');
        entries.push(new Route(args.shift(), args.shift(), args, args.shift()));
        return this;
    }

    any(methods, path, opts, ...middleware) {
        var args = this._resolveArgs(...arguments);
        args[2].type = Route.TYPES.DEFINE;
        return this.define(...args);
    }

    get(path, opts, ...middleware) {
        var args = this._resolveArgs(...arguments);
        args[0] = ['GET'];
        args[2].type = Route.TYPES.DEFINE;
        return this.define(...args);
    }

    post(path, opts, ...middleware) {
        var args = this._resolveArgs(...arguments);
        args[0] = ['POST'];
        args[2].type = Route.TYPES.DEFINE;
        return this.define(...args);
    }

    put(path, opts, ...middleware) {
        var args = this._resolveArgs(...arguments);
        args[0] = ['PUT'];
        args[2].type = Route.TYPES.DEFINE;
        return this.define(...args);
    }

    patch(path, opts, ...middleware) {
        var args = this._resolveArgs(...arguments);
        args[0] = ['PATCH'];
        args[2].type = Route.TYPES.DEFINE;
        return this.define(...args);
    }

    delete(path, opts, ...middleware) {
        var args = this._resolveArgs(...arguments);
        args[0] = ['DELETE'];
        args[2].type = Route.TYPES.DEFINE;
        return this.define(...args);
    }

    head(path, opts, ...middleware) {
        var args = this._resolveArgs(...arguments);
        args[0] = ['HEAD'];
        args[2].type = Route.TYPES.HEADER;
        return this.register(...args);
    }

    options(path, opts, ...middleware) {
        var args = this._resolveArgs(...arguments);
        args[0] = ['OPTIONS'];
        args[2].type = Route.TYPES.OPTION;
        return this.register(...args);
    }

    define(...args) {
        var opts = args[2];
        var middleware = args.slice(3);
        var parseBody = Object.assign({}, opts.parseBody || this.opts.parseBody);
        if (opts.annotations) {
            let annotations = opts.annotations;
            let path = args[1].replace(/:([^/]+)/g, '{$1}').replace(/[?*+]/g, '');
            annotations.operationId = annotations.operationId || middleware[0] && middleware[0].name;
            args[0].forEach(METHOD => {
                let method = METHOD.toLowerCase();
                if (~allowedRestfulMethods.indexOf(method)) {
                    doc.annotate(method, path, annotations);
                    if (annotations.parameters && opts.validator !== false) {
                        middleware.unshift(prepares.validate(method, path));
                    }
                }
            });
        }
        if (opts.type === Route.TYPES.UPLOAD) {
            middleware.unshift(middleware.pop());
        } else if (args[0].some(m => ~['POST', 'PUT', 'PATCH'].indexOf(m))) {
            middleware.unshift(prepares.body(parseBody));
        }
        var allowCross = opts.allowCross || (opts.allowCross !== false && this.opts.allowCross);
        if (allowCross) {
            this.options(args[1], args[2], prepares.cors(allowCross));
            middleware.unshift(prepares.cors(allowCross));
        }
        if (~args[0].indexOf('GET') && !~args[0].indexOf('HEAD')) {
            this.head(...args.slice(1));
        }
        return this.register(args[0], args[1], args[2], ...middleware);
    }

    upload(...args) {
        args = this._resolveArgs(...args);
        var uploadFile = Object.assign({}, args[2].uploadFile || this.opts.uploadFile);
        args[0] = ~['POST', 'PUT', 'PATCH'].indexOf(args[0][0]) ? args[0] : ['POST'];
        args[2].type = Route.TYPES.UPLOAD;
        uploadFile.continuous = args.length > 3;
        args.push(prepares.upload(uploadFile));
        return this.define(...args);
    }

    static(...args) {
        args = this._resolveArgs(...args);
        var staticFile = Object.assign({}, args[2].staticFile || this.opts.staticFile);
        args[0] = ['GET'];
        args[1] = staticFile && staticFile.filename ? args[1] : args[1] + '/:filename*';
        args[2].type = Route.TYPES.STATIC;
        staticFile.continuous = args.length > 3;
        args.splice(3, 0, prepares.static(staticFile));
        this.head(...args.slice(1));
        return this.register(...args);
    }

    render(...args) {
        args = this._resolveArgs(...args);
        var renderFile = Object.assign({}, args[2].renderFile || this.opts.renderFile);
        args[0] = ['GET'];
        args[2].type = Route.TYPES.RENDER;
        args.push(prepares.render(renderFile));
        this.head(...args.slice(1));
        return this.register(...args);
    }

    register(methods, path, opts, ...middleware) {
        routes.push(new Route(methods, path, middleware, opts));
        return this;
    }

    redirect(source, target, code) {
        source = this._resolvePath(source);
        target = this._resolvePath(target);

        return this.any(source, ctx => {
            ctx.redirect(target);
            ctx.status = code || 301;
        });
    }

    beforeStart(fn) {
        return Router.beforeStart(fn);
    }

    static beforeStart(fn) {
        if (typeof fn === 'function') hooks.push(fn);
    }

    /**
     * koa middleware
     * @returns {*}
     */
    routes(options) {
        return Router.routes.call(this, options);
    }

    /**
     * koa middleware
     * @returns {*}
     */
    static routes() {
        if (isReady) {
            return;
        } else {
            isReady = true;
        }

        var router = this instanceof Router ? this : new Router();
        var options = router.opts;

        router.beforeStart(compileValidate(options.validator));

        if (options.swagger !== false) {
            doc.createSwagger(router, options.swagger);
        }

        hooks.forEach(fn => fn(routes));

        return async function combinedMiddleware(ctx, next) {
            var path = ctx.path;
            var method = ctx.method;
            var matched = [];
            var matchedRoute;

            for (let i = routes.length - 1; i >= 0; i--) {
                let route = routes[i];
                if (route.match(method, path)) {
                    matchedRoute = route;
                    debug('matched %s - %s', method, path);
                    break;
                }
            }

            if (!matchedRoute) return next();

            for (let i = 0; i < entries.length; i++) {
                let route = entries[i];
                if (route.match(method, path)) {
                    matched.push(route);
                }
            }

            matched.push(matchedRoute);

            var middleware = matched.reduce((ms, route) => {
                ms.push(function injectContext(ctx, next) {
                    ctx.route = route;
                    ctx.router = router;
                    ctx.params = Object.assign({}, ctx.params, route.params, matchedRoute.params);
                    ctx.routeOptions = matchedRoute.routeOptions;
                    return next();
                });
                return ms.concat(route.stack);
            }, []);

            return compose(middleware)(ctx, next);
        }
    }

    _resolvePath(path) {
        path = path.replace(/^\.\//, '');
        return /^\//.test(path) ? path : this.opts.prefix + '/' + path;
    }

    _resolveArgs(...args) {
        var methods, path, opts;

        if (Array.isArray(args[0])) {
            methods = args.shift();
        } else if (~this.opts.methods.indexOf(args[0])) {
            methods = [args.shift()];
        } else {
            methods = this.opts.methods;
        }

        if (typeof args[0] === 'string') {
            path = this._resolvePath(args.shift());
        } else if (args[0] instanceof RegExp) {
            path = args.shift();
        } else {
            path = '(.*)';
        }

        if (isObject(args[0])) {
            opts = args.shift();
        } else if (isObject(args[args.length - 1])) {
            opts = args.pop();
        } else {
            opts = {};
        }

        return [methods, path, Object.assign({}, opts), ...args];
    }
}

function isObject(obj) {
    return obj && Object.prototype.toString.call(obj) === '[object Object]';
}

module.exports = Router;
