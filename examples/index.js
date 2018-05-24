var path = require('path');
var koa = require('koa');
var Router = require('../src');

var app = new koa();
var router = new Router({
    allowCross: true,
    document: {
        title: 'Swagger Demo',
        version: '1.0.0',
        description: '演示如何使用Swagger-UI来展示API文档。**所有的description都支持markdown语法。**',
        host: '127.0.0.1:8444',
        basePath: '/',
        tags: {
            category: '分类相关',
            article: '文章相关'
        },
        // schemes: ['http', 'https', 'ws', 'wss'],
        // optional external docs, for example: wiki
        externalDocs: {
            description: '关于Router',    // 支持markdown
            url: 'http://cnpm.51.nb/package/@u51/router'
        }
    }
});

router.use('POST', async function authorizeMiddleware(ctx, next) {
    console.log('Authorize in!');
    await next();
});

router.param(/^\/api/, 'tag', async function paramTag(tag, ctx, next) {
    console.log(tag);
    await next();
});

router.use(async function allRouterMiddleware(ctx, next) {
    console.log('All router in!');
    console.log(ctx.routeOptions);
    await next();
});

router.get('/index', {
    routeOptions: {
        foo: 'baz'
    }
}, async function getIndex(ctx, next) {
    console.log(ctx.routeOptions);
    ctx.body = 'Hello world';
});

router.prefix('/page')
    .get('./1', async function getPage1(ctx, next) {
        ctx.body = 'Page 1';
    })
    .get('./2', async function getPage2(ctx, next) {
        ctx.body = 'Page 2';
    });

router.get('/error', async function getError(ctx, next) {
    try {
        throw new Error('error');
    } catch(e) {
        ctx.status = 500;
        ctx.body = e.message;
    }
});

router.use(/\/api\/v1\/(.+)/, async function allApiMiddleware(ctx, next) {
    console.log('in RegExp, params: ', ctx.params);
    await next();
});

router.prefix('/api/v1');

router
    .get('./category/a', async function getCategoryA(ctx, next) {
        ctx.body = 'Category a';
    }, {
        annotations: {
            tags: ['category'],
            summary: '获取分类a',
            description: '获取分类**a**',
            operationId: 'getCategory',
            parameters: {
                header: {
                    Authorization: {
                        type: 'string',
                        description: '身份验证',
                        required: false
                    }
                },
                path: {},
                body: {},
                query: {
                    sign: {
                        type: 'string',
                        description: '签名字段',
                        required: true
                    }
                }
            },
            responses: {
                "200": {},
                "500": {}
            }
        }
    })
    .get('./category/b', async function getCategoryB(ctx, next) {
        ctx.body = 'Category b';
    }, {
        annotations: {
            tags: ['category'],
            summary: '获取分类b',
            description: '获取分类**b**',
            parameters: {
                header: {
                    Authorization: {
                        type: 'string',
                        description: '身份验证',
                        required: false
                    }
                },
                path: {},
                body: {},
                query: {}
            },
            responses: {
                "200": {},
                "500": {}
            }
        }
    });

router.get('./tag/:tag', async function getTag(ctx, next) {
    ctx.body = {
        data: `The tag is ${ctx.params.tag}，at page ${ctx.query.pageIndex || 1}/${ctx.query.pageSize}`
    };
}, {
    annotations: {
        tags: ['tags'],
        summary: '获取tag下的文章',
        description: '获取指定tag下的所有文章列表',
        parameters: {
            header: {
                Authorization: {
                    type: 'string',
                    description: '身份验证',
                    required: false
                }
            },
            path: {
                tag: {
                    type: 'string',
                    description: 'tag名称',
                    required: true
                }
            },
            body: {},
            query: {
                pageIndex: {
                    type: 'integer',
                    description: '当前页码，默认为1',
                    default: 1
                },
                pageSize: {
                    type: 'integer',
                    description: '每页记录条数，可为10、20、50',
                    default: 10,
                    enum: [10, 20, 50]
                }
            }
        },
        responses: {
            "200": {},
            "500": {}
        }
    }
});

router.get('./article/:id', async function getArticle(ctx, next) {
    ctx.body = `The article id is ${ctx.params.id}`;
});

router.post('./article', {
    allowCross: {
        origin: true
    },
    annotations: {
        tags: ['article'],
        summary: '发表文章',
        // description: '发表文章',
        parameters: {
            header: {
                Authorization: {
                    type: 'string',
                    description: '身份验证',
                    required: true
                }
            },
            path: {},
            body: {
                __name__: 'article',    // 默认为body
                __required__: true,     // 默认为true
                __description__: '',    // 默认为空
                title: {
                    type: 'string',
                    pattern: /^[^\s]{1,100}$/,
                    description: '文章标题',
                    required: true,
                    default: '文章标题'
                },
                content: {
                    type: 'string',
                    description: '文章内容',
                    pattern: /.{20,}/,
                    required: true,
                    default: '文章内容'
                }
            },
            query: {}
        },
        responses: {
            "200": {},
            "500": {}
        }
    }
}, async function postArticle(ctx, next) {
    console.log(ctx.request.body);
    // console.log(ctx.req.body);
    ctx.body = 'Post success';
});

router.upload('./upload', {
    uploadFile: {
        root: path.resolve(__dirname, 'uploads'),
        allowedFileExts: 'js,png'
    }
}, async (ctx, next) => {
    console.log(ctx.req.body);
    console.log(ctx.req.files);
    console.log(ctx.request.body);
    console.log(ctx.request.files);
    ctx.body = '上传成功!';
});

router.static('/index.html', {
    staticFile: {
        filename: 'index.html',
        root: __dirname
    }
});

app.use(router.routes());
// app.use(Router.routes());

app.listen(8444, '0.0.0.0', function() {
    console.log('http://localhost:8444');
});
