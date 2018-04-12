var Router = require('../../src');
var assert = require('assert');

var router1 = new Router({
    methods: ['GET', 'POST']
});

var router2 = new Router({
    methods: ['GET', 'POST', 'HEAD', 'DELETE']
});

var router3 = new Router();

describe('Router Constructor', function () {
    it('router1.options.methods should be ["GET", "POST"]', function () {
        assert.deepEqual(router1.opts.methods, ['GET', 'POST']);
    });

    it('router2.options.methods should be ["GET", "POST", "HEAD", "DELETE"]', function () {
        assert.deepEqual(router2.opts.methods, ['GET', 'POST', 'HEAD', 'DELETE']);
    });

    it('router3.options.methods should be ["HEAD", "OPTIONS", "GET", "PUT", "PATCH", "POST", "DELETE"]', function () {
        assert.deepEqual(router3.opts.methods, ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE']);
    });
});