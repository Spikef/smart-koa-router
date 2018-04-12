var debug = require('debug')('upload');
var path = require('path');

var Busboy = require('busboy');
var UploadError = require('./lib/upload-error');
var FileStorage = require('./storage/file');
var MemoStorage = require('./storage/memory');

var defaultOptions = {
    storage: null,        // class - The stream storage (Default: FileStorage when root is specified, MemoryStorage ether)
    allowedFileExts: null,  // string|array - The allowed file extensions (Default: *)
    allowedFileNames: null, // string|array - The allowed file input's name (Default: *)
    root: null,             // the absolute path of the file saved directory
    mode: null,             // directory mode for create root (Default: 0777)
    multiple: false,        // boolean - allow input's multiple (Default: false)
    fieldNameSize: null,    // integer - Max field name size (in bytes) (Default: 100 bytes)
    fieldValueSize: null,   // integer - Max field value size (in bytes) (Default: 1MB)
    fieldsCount: null,      // integer - Max number of non-file fields (Default: Infinity)
    fileSize: 20480000,     // integer - For multipart forms, the max file size (in bytes) (Default: Infinity)
    filesCount: null,       // integer - For multipart forms, the max number of file fields (Default: Infinity)
    partsCount: null,       // integer - For multipart forms, the max number of parts (fields + files) (Default: Infinity)
};

module.exports = function uploadFile(options) {
    options = Object.assign({}, defaultOptions, options);

    var onerror, allowedFileExts, allowedFileNames, Storage, limits = {};
    if (options.onerror && typeof options.onerror === 'function') {
        onerror = options.onerror;
    }
    if (options.storage) {
        Storage = options.storage;
    } else if (options.root) {
        Storage = FileStorage;
    } else {
        Storage = MemoStorage;
    }
    if (typeof options.allowedFileExts === 'string') {
        allowedFileExts = options.allowedFileExts.split(/\s*[,，]\s*/);
    } else if (Array.isArray(options.allowedFileExts)) {
        allowedFileExts = options.allowedFileExts;
    } else {
        allowedFileExts = '*';
    }
    if (Array.isArray(allowedFileExts)) {
        allowedFileExts = allowedFileExts.map(ext => /\./.test(ext) ? ext : `.${ext}`);
    }
    if (typeof options.allowedFileNames === 'string') {
        allowedFileNames = options.allowedFileNames.split(/\s*[,，]\s*/);
    } else if (Array.isArray(options.allowedFileNames)) {
        allowedFileNames = options.allowedFileNames;
    } else {
        allowedFileNames = '*';
    }
    if (options.fieldNameSize != null) {
        limits.fieldNameSize = options.fieldNameSize;
    }
    if (options.fieldValueSize != null) {
        limits.fieldSize = options.fieldValueSize;
    }
    if (options.fieldsCount != null) {
        limits.fields = options.fieldsCount;
    }
    if (options.fileSize != null) {
        limits.fileSize = options.fileSize;
    }
    if (options.filesCount != null) {
        limits.files = options.filesCount;
    }
    if (options.partsCount != null) {
        limits.parts = options.partsCount;
    }

    var storage = new Storage({ root: options.root, mode: options.mode });

    return async function uploadFileMiddleware(ctx, next) {
        var req = ctx.req;
        var files = {}, fields = {};

        try {
            if (!~req.headers['content-type'].indexOf('multipart/form-data')) {
                throw new UploadError(UploadError.UN_SUPPORT_TYPE);
            }

            var count = 0;
            var rollbacks = [];
            var busboy = new Busboy({ headers: req.headers, limits: limits });
            try {
                await new Promise((resolve, reject) => {
                    busboy.on('file', function(name, file, filename, encoding, mimeType) {
                        count++;
                        if (!name || !filename) {
                            return reject(new UploadError(UploadError.EMPTY_FILENAME));
                        }

                        if (options.multiple) {
                            files[name] = files[name] || [];
                        } else if (files[name]) {
                            return reject(new UploadError(UploadError.NOT_ALLOW_MULTIPLE));
                        }

                        if (Array.isArray(allowedFileNames) && !~allowedFileNames.indexOf(name)) {
                            return reject(new UploadError(UploadError.INVALID_FILE_NAME));
                        }

                        var ext = path.extname(filename);
                        if (!ext || (Array.isArray(allowedFileExts) && !~allowedFileExts.indexOf(ext))) {
                            return reject(new UploadError(UploadError.INVALID_FILE_TYPE));
                        }

                        file.on('error', reject);

                        file.on('limit', function() {
                            return reject(new UploadError(UploadError.LIMIT_FILE_SIZE));
                        });

                        rollbacks.push(storage.handle(file, {
                            name: name,
                            mimeType: mimeType,
                            filename: filename,
                            extension: ext
                        }, function(err, props) {
                            if (err) {
                                return reject(err);
                            } else {
                                if (Array.isArray(files[props.name])) {
                                    files[name].push(props);
                                } else {
                                    files[name] = props;
                                }
                                if (--count === 0) busboy.emit('success');
                            }
                        }));
                    });
                    busboy.on('field', function(name, value, nameTruncated, valueTruncated) {
                        if (nameTruncated) return reject(new UploadError(UploadError.LIMIT_FIELD_NAME));
                        if (valueTruncated) return reject(new UploadError(UploadError.LIMIT_FIELD_VALUE));
                        // Work around bug in Busboy (https://github.com/mscdex/busboy/issues/6)
                        if (limits && limits.hasOwnProperty('fieldNameSize') && (name.length > limits.fieldNameSize)) {
                            return reject(new UploadError(UploadError.LIMIT_FIELD_NAME));
                        }
                        fields[name] = value;
                    });
                    busboy.on('error', function(err) { return reject(err); });
                    busboy.on('partsLimit', function() { return reject(new UploadError(UploadError.LIMIT_PART_COUNT)) });
                    busboy.on('filesLimit', function() { return reject(new UploadError(UploadError.LIMIT_FILE_COUNT)) });
                    busboy.on('fieldsLimit', function() { return reject(new UploadError(UploadError.LIMIT_FIELD_COUNT)) });
                    busboy.on('success', function() {
                        // "finish" is not really finished.
                        debug(fields);
                        debug(files);
                        ctx.req.body = ctx.request.body = fields;
                        ctx.req.files = ctx.request.files = files;
                        ctx.req.formData = Object.assign({}, fields, files);
                        ctx.request.formData = ctx.req.formData;

                        return resolve();
                    });

                    req.pipe(busboy);
                });

                if (options.continuous) await next();
            } catch(err) {
                req.unpipe(busboy);
                req.on('readable', req.read.bind(req));
                busboy.removeAllListeners();

                rollbacks.forEach(fn => fn());

                throw err;
            }
        } catch(err) {
            if (onerror) {
                onerror.call(ctx, err);
            } else {
                var message;
                if (err instanceof UploadError) {
                    message = err.message;
                } else {
                    console.error(err);
                    message = 'Failed to upload files';
                }

                ctx.status = 500;
                ctx.body = {
                    code: 500500,
                    message: message
                }
            }
        }
    }
};
