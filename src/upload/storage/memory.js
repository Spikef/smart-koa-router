class Storage {
    /**
     * File Transport
     * @param {Object} [options]
     */
    constructor(options = {}) {}

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
        var buffers = [];
        file.on('data', function(buffer) {
            buffers.push(buffer);
        });
        file.on('end', function() {
            if (aborted) return;
            var buf = Buffer.concat(buffers);
            callback(null, {
                data: buf,
                size: buf.length
            });
        });

        return function rollback() {
            try {
                buffers = null;
            } catch(e) {}
            try {
                file.data = null;
            } catch(e) {}
        }
    }
}

module.exports = Storage;
