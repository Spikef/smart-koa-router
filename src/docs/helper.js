exports.resolveInfo = function(spec) {
    spec.info = Object.assign({}, {
        title: spec.title,
        version: spec.version,
        description: spec.description
    }, spec.info);

    delete spec.title;
    delete spec.version;
    delete spec.description;
};

exports.resolveTags = function(spec) {
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

exports.resolveParameters = function(spec) {
    if (spec.parameters && !Array.isArray(spec.parameters)) {
        var parameters = [];
        Object.keys(spec.parameters).forEach($in => {
            if ($in === 'body') {
                if (!Object.keys(spec.parameters[$in]).length) return;
                let param = {
                    name: spec.parameters[$in].__name__ || 'body',
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

exports.resolveSchema = function(params) {
    if (Array.isArray(params)) {
        return {
            type: 'array',
            items: params
        }
    } else {
        var _params = {};
        for (let i in params) {
            if (!(params.hasOwnProperty(i))) continue;
            if (!/^__.+__$/.test(i)) {
                _params[i] = params[i];
            }
        }
        return {
            type: 'object',
            properties: _params
        }
    }
};
