exports.resolveInfo = function resolveInfo(spec) {
    spec.info = Object.assign({}, {
        title: spec.title,
        version: spec.version,
        description: spec.description
    }, spec.info);

    delete spec.title;
    delete spec.version;
    delete spec.description;
};

exports.resolveTags = function resolveTags(spec) {
    if (spec.tags && !Array.isArray(spec.tags)) {
        var tags = [];
        for (let name in spec.tags) {
            if (!spec.tags.hasOwnProperty(name)) continue;
            tags.push({
                name: name,
                description: spec.tags[name]
            });
        }
        spec.tags = tags;
    }
};

exports.resolveParameters = function resolveParameters(spec) {
    if (spec.parameters && !Array.isArray(spec.parameters)) {
        var parameters = [];
        Object.keys(spec.parameters).forEach($in => {
            if ($in === 'body') {
                if (!Object.keys(spec.parameters[$in]).length) return;
                let param = {
                    name: spec.parameters[$in].__name__ || 'body',
                    description: spec.parameters[$in].__description__ || '',
                    in: 'body',
                    schema: this.resolveSchema(spec.parameters[$in]),
                    required: spec.parameters[$in].__required__ !== false
                };
                parameters.push(param);
            } else {
                Object.keys(spec.parameters[$in]).forEach($name => {
                    let param = spec.parameters[$in][$name];
                    param.name = $name;
                    param.in = $in;
                    parameters.push(param);
                });
            }
        });
        spec.parameters = parameters;
    }
};

exports.resolveSchema = function resolveSchema(params) {
    var param = {};
    if (Array.isArray(params)) {
        param.type = 'array';
        param.items = resolveSchema(params[0]);
    } else if (!params.type) {
        param.type = 'object';
        var properties = {};
        var required = [];
        for (let i in params) {
            if (!(params.hasOwnProperty(i))) continue;
            if (/^__(.+)__$/.test(i)) {
                param[RegExp.$1] = params[i];
            } else {
                if (params[i] && params[i].required) {
                    required.push(i);
                    delete params[i].required;
                }
                if (Array.isArray(params[i]) || !params[i].type) {
                    params[i] = resolveSchema(params[i]);
                }
                properties[i] = params[i];
            }
        }
        param.required = required;
        param.properties = properties;
    } else {
        param = params;
    }
    return param;
};
