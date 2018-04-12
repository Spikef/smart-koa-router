module.exports = function(method, path) {
    return function __validateMiddlewarePlaceholder__() {
        return { method, path };
    };
};