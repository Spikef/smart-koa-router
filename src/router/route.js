var debug = require('debug')('Route');
var Parse = require('open-path');

var TYPES = Object.freeze({
    DEFINE: 'define',
    UPLOAD: 'upload',
    STATIC: 'static',
    RENDER: 'render',
    HEADER: 'header',
    OPTION: 'option'
});

class Route {
    /**
     * Initialize a new routing Layer with given `method`, `path`, and `middleware`.
     *
     * @param {Array} methods - Array of HTTP verbs.
     * @param {String} path - Path string.
     * @param {Array} middleware - Layer callback/middleware or series of.
     * @param {Object} opts
     * @param {String} [opts.name] - route name
     * @param {String} [opts.type] - route type
     * @param {String} [opts.description] - route description
     * @param {String|String[]} [opts.methods] - allowed methods
     * @param {Object} [opts.routeOptions] - custom route options
     * @param {Boolean} [opts.parseBody] - need parse body?
     * @param {Object} [opts.annotations] - annotations for this api
     * @param {Object} [opts.annotations.parameters] - parameters
     * @param {Object} [opts.annotations.responses] - responses
     * @returns {Route}
     * @private
     */
    constructor(methods, path, middleware, opts = {}) {
        this.opts = opts;
        this.name = opts.name || path;
        this.type = opts.type;
        this.description = opts.description || (opts.annotations && opts.annotations.description) || '';
        this.methods = [];
        this.stack = Array.isArray(middleware) ? middleware : [middleware];

        methods.forEach(method => {
            if (method && typeof method === 'string') {
                method = method.toUpperCase();
                this.methods.push(method);
            }
        });

        // ensure middleware is a function
        this.stack.forEach(fn => {
            var type = typeof fn;
            if (type !== 'function') {
                throw new Error(`${String(methods)} ${(this.name)}: middleware must be a function, not ${type}`);
            }
        });

        this.path = path;
        this.parse = new Parse(path);
        this.routeOptions = Object.assign({}, opts.routeOptions, {
            name: this.name,
            type: this.type,
            params: [...this.parse.params]
        });

        debug('defined %o %s', this.methods, this.path, this.opts);
    }

    match(method, path) {
        method = String(method).toUpperCase();
        return ~this.methods.indexOf(method) && (this.params = this.parse.match(path));
    }
}

Route.TYPES = Route.prototype.TYPES = TYPES;

module.exports = Route;
