var cors = require('./cors');

var defaultOptions = Object.freeze({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    maxAge: null,
    credentials: false,
    allowedHeaders: null,
    exposedHeaders: null,
    optionsSuccessStatus: 204
});

module.exports = function allowCors(options) {
    options = Object.assign({}, defaultOptions, options);
    if (Array.isArray(options.methods)) {
        options.methods = options.methods.toString(); // .methods is an array, so turn it into a string
    }

    return async function allowCorsMiddleware(ctx, next) {
        var request = {
            method: ctx.method,
            origin: ctx.get('Origin'),
            headers: ctx.headers
        };

        var ret = cors(request, options);

        ret.headers.forEach(header => {
            ctx.set(header.key, header.value);
        });

        if (request.method === 'OPTIONS') {
            ctx.status = ret.statusCode;
            ctx.body = Buffer.alloc(0);
        } else {
            await next();
        }
    }
};