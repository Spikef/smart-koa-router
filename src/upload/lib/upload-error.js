class UploadError extends Error {
    constructor(message) {
        super();
        this.message = message;
        this.name = 'UploadError';
    }
}

UploadError.UN_SUPPORT_TYPE = 'Content type is not supported.';
UploadError.EMPTY_FILENAME = 'File name is undefined.';
UploadError.NOT_ALLOW_MULTIPLE = 'Multiple files is not allowed.';
UploadError.INVALID_FILE_NAME = 'File name is not allowed.';
UploadError.INVALID_FILE_TYPE = 'File type is not allowed.';
UploadError.LIMIT_FIELD_NAME = 'Field name is too large.';
UploadError.LIMIT_FIELD_VALUE = 'Field value is too large.';
UploadError.LIMIT_FILE_SIZE = 'File is too large.';
UploadError.LIMIT_PART_COUNT = 'Too many parts.';
UploadError.LIMIT_FILE_COUNT = 'Too many files.';
UploadError.LIMIT_FIELD_COUNT = 'Too many fields.';

module.exports = UploadError;