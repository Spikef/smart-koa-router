var vary = require('./vary');

function isString(s) {
    return typeof s === 'string' || s instanceof String;
}

function isOriginAllowed(origin, allowedOrigin) {
    if (Array.isArray(allowedOrigin)) {
        for (var i = 0; i < allowedOrigin.length; ++i) {
            if (isOriginAllowed(origin, allowedOrigin[i])) {
                return true;
            }
        }
        return false;
    } else if (isString(allowedOrigin)) {
        return origin === allowedOrigin;
    } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
    } else {
        return !!allowedOrigin;
    }
}

function configureOrigin(options, requestOrigin) {
    var headers = [],
        isAllowed;

    if (!options.origin || options.origin === '*') {
        // allow any origin
        headers.push({
            key: 'Access-Control-Allow-Origin',
            value: '*'
        });
    } else if (isString(options.origin)) {
        // fixed origin
        headers.push({
            key: 'Access-Control-Allow-Origin',
            value: options.origin
        });
        headers.push({
            key: 'Vary',
            value: 'Origin'
        });
    } else {
        isAllowed = isOriginAllowed(requestOrigin, options.origin);
        // reflect origin
        headers.push({
            key: 'Access-Control-Allow-Origin',
            value: isAllowed ? requestOrigin : false
        });
        headers.push({
            key: 'Vary',
            value: 'Origin'
        });
    }

    return headers;
}

function configureMethods(options) {
    return {
        key: 'Access-Control-Allow-Methods',
        value: options.methods
    };
}

function configureCredentials(options) {
    if (options.credentials === true) {
        return {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
        };
    }
}

function configureAllowedHeaders(options, requestHeaders) {
    var allowedHeaders = options.allowedHeaders;
    var headers = [];

    if (!allowedHeaders) {
        allowedHeaders = requestHeaders['access-control-request-headers']; // .headers wasn't specified, so reflect the request headers
        headers.push({
            key: 'Vary',
            value: 'Access-Control-Request-Headers'
        });
    } else if (Array.isArray(allowedHeaders)) {
        allowedHeaders = allowedHeaders.toString(); // .headers is an array, so turn it into a string
    }

    if (allowedHeaders && allowedHeaders.length) {
        headers.push({
            key: 'Access-Control-Allow-Headers',
            value: allowedHeaders
        });
    }

    return headers;
}

function configureExposedHeaders(options) {
    var headers = options.exposedHeaders;
    if (Array.isArray(headers)) {
        headers = headers.toString(); // .headers is an array, so turn it into a string
    }
    if (headers && headers.length) {
        return {
            key: 'Access-Control-Expose-Headers',
            value: headers
        };
    }
}

function configureMaxAge(options) {
    var maxAge = options.maxAge && options.maxAge.toString();
    if (maxAge && maxAge.length) {
        return {
            key: 'Access-Control-Max-Age',
            value: maxAge
        };
    }
    return null;
}

function createHeaders(headers, header) {
    if (header) {
        if (Array.isArray(header)) {
            header.forEach(h => headers.push(h));
        } else if (header.key === 'Vary' && header.value) {
            vary(headers, header.value);
        } else if (header.value) {
            headers.push(header);
        }
    }
}

/**
 * Cors
 * @param {Object} request - http request
 * @param {String} request.method
 * @param {String} request.origin
 * @param {Object} request.headers
 * @param {Object} options
 */
function cors(request, options) {
    var headers = [], statusCode = null,
        method = request.method;

    if (method === 'OPTIONS') {
        // pre-request
        createHeaders(headers, configureOrigin(options, request.origin));
        createHeaders(headers, configureCredentials(options));
        createHeaders(headers, configureMethods(options));
        createHeaders(headers, configureAllowedHeaders(options, request.headers));
        createHeaders(headers, configureMaxAge(options));
        createHeaders(headers, configureExposedHeaders(options));

        // Safari (and potentially other browsers) need content-length 0,
        //   for 204 or they just hang waiting for a body
        headers.push({
            key: 'Content-Length',
            value: 0
        });

        statusCode = options.optionsSuccessStatus;
    } else {
        // actual response
        createHeaders(headers, configureOrigin(options, request.origin));
        createHeaders(headers, configureCredentials(options));
        createHeaders(headers, configureExposedHeaders(options));
    }

    return { headers, statusCode }
}

module.exports = cors;