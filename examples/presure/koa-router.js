var koa = require('koa');
var Router = require('koa-router');

var app = new koa();
var router = new Router();

router.use('*', function(ctx, next) {
    return next();
});

router.get('/index', function(ctx, next) {
    ctx.status = 200;
    ctx.body = 'Hello world!';
});

app.use(router.routes());

app.listen(8444, '0.0.0.0', function() {
    console.log('http://localhost:8444');
});
