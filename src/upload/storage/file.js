var debug = require('debug')('Storage');
var fs = require('fs');
var path = require('path');
var uuid = require('uuid/v4');
var mkdir = require('mkdirp');

class Storage {
    /**
     * File Transport
     * @param {Object} options
     * @param {String} options.root - the root directory to save uploaded files
     * @param {Number} [options.mode] - the directory permission
     */
    constructor(options = {}) {
        if (!options.root) {
            throw new Error('The root directory is undefined.');
        }

        this.root = options.root;
        this.temp = this.root + path.sep + 'tmp';

        debug('mkdir %s', this.root);
        mkdir.sync(this.root, { mode: options.mode });

        debug('mkdir %s', this.temp);
        mkdir.sync(this.temp, { mode: options.mode });
    }

    /**
     * handle busboy's file
     * @param {Stream} file
     * @param {Object} props
     * @param {String} props.name - the name filed of input form control
     * @param {String} props.mimeType - the mine type of the uploaded file
     * @param {String} props.filename - the original filename
     * @param {String} props.extension - the original file extension
     * @param {Function} callback
     * @return {Function} rollback
     */
    handle(file, props, callback) {
        var aborted = false;
        var signature = uuid();
        var temporary = path.join(this.temp, signature + props.extension);
        var finalPath = path.join(this.root, signature + props.extension);
        var outStream = fs.createWriteStream(temporary);

        file.pipe(outStream);
        outStream.on('error', function(err) {
            callback(err);
        });
        outStream.on('finish', function () {
            if (aborted) return;
            fs.renameSync(temporary, finalPath);
            callback(null, Object.assign({
                path: finalPath,
                size: outStream.bytesWritten,
                unit: 'B',
                uuid: signature,
            }, props));
        });

        return function rollback() {
            aborted = true;
            try {
                outStream.close();
            } catch(e) {}
            try{
                fs.unlinkSync(temporary);
            } catch(e) {}
            try{
                fs.unlinkSync(finalPath);
            } catch(e) {}
        };
    }
}

module.exports = Storage;
