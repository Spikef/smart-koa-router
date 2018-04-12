var path = require('path');
var extend = require('extend2');
var helper = require('./helper');

var spec = require('./template');

exports.spec = spec;

exports.init = function(document) {
    helper.resolveInfo(document);
    helper.resolveTags(document);
    extend(true, spec, document);
};

exports.define = function(key, definitions) {
    spec.definitions = spec.definitions || {};
    spec.definitions[key] = definitions;
};

exports.annotate = function(method, path, annotations) {
    helper.resolveParameters(annotations);

    spec.paths = spec.paths || {};
    spec.paths[path] = spec.paths[path] || {};
    spec.paths[path][method] = annotations;
};

/**
 *
 * @param {Router} router - router instance
 * @param {Object|Boolean} [options] - options for create Swagger
 * @param {String} [options.docApi] - default "/api-docs"
 * @param {String} [options.docUrl] - default "/swagger-ui.html"
 * @param {Object} [options.swaggerUi] - swaggerUi options
 * @param {String} [options.swaggerUi.home] - homepage, default: '/'
 * @param {String} [options.swaggerUi.title] - title, default: 'Swagger UI'
 * @param {String} [options.swaggerUi.pageTitle] - page title, default: 'Swagger'
 * @param {String} [options.swaggerUi.url] - default api url, default: '/api-docs'
 * @param {Object} [options.swaggerUi.auth] - swagger authorize, default: null
 */
exports.createSwagger = function(router, options) {
    options = options || {};
    var docApi = options.docApi || '/api-docs';
    var docUrl = options.docUrl || '/swagger-ui.html';

    router.static('/swagger-ui', {
        staticFile: {
            root: path.resolve(__dirname, 'swagger-ui/swagger-ui')
        }
    });

    router.render(docUrl, {
        renderFile: {
            template: path.resolve(__dirname, 'swagger-ui/index.ejs'),
            data: Object.assign({
                home: '/',
                title: 'Swagger UI',
                pageTitle: 'Swagger',
                url: '/api-docs',
                auth: null
            }, options.swaggerUi)
        }
    });

    var document;
    router.get(docApi, async (ctx, next) => {
        ctx.status = 200;
        ctx.type = 'application/json';
        ctx.body = document || (document = JSON.stringify(spec, function replacer(key, value) {
            if (key === 'pattern' && value instanceof RegExp) {
                return value.toString();
            }

            return value;
        }));
    });
};
