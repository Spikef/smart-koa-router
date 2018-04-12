var debug = require('debug')('Engine');
var fs = require('fs');
var path = require('path');
var ejs = require('ejs');

class Engine {
    /**
     * New Engine
     * @param template
     */
    constructor(template) {
        var content = fs.readFileSync(template, 'utf8');
        var options = {
            root: path.dirname(template),
            filename: path.basename(template)
        };

        debug('options: ', options);

        this.renderer = ejs.compile(content, options);
    }

    render(data) {
        return this.renderer(data);
    }
}

module.exports = Engine;