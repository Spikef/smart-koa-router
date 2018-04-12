var koa = require('koa');

var app = new koa();

app.use(function(ctx, next) {
    return next();
});

app.use(function(ctx, next) {
    if (ctx.method === 'GET' && ctx.path === '/index') {
        ctx.body = 'Hello world!';
    } else {
        return next();
    }
});

app.listen(8444, '0.0.0.0', function() {
    console.log('http://localhost:8444');
});
