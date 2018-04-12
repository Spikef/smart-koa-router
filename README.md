# smart-koa-router

## 概述

`smart-koa-router`是一个复合型的`Koa`路由处理模块，支持Restful API、静态文件、文件上传、模板渲染，自动解析body参数，支持允许跨域请求，支持API参数校验和自动生成文档，支持应用启动时拦截等功能。

这是一个与`koa-router`在使用方式上接近，但是设计理念完全不同的`Koa`路由处理模块：不仅覆盖了web应用需要的所有场景，而且更加灵活方便，在性能上也比`koa-router`表现更为优异。

## 如何使用

`Router`是一个`class`，且使用了`async`和`await`，因此需要在`node v7.6+`环境中才能使用。

### 实例化

你可以根据需要多次实例化`Router`对象，每个实例化`router`对象使用不同的配置。

```javascript
var Router = require('smart-koa-router');
var router = new Router();

router.get('/index', function(ctx) {
    ctx.body = 'Hello world!';
});
```

所有的配置参数都是可选的，这时会使用默认值或者具体某个路由的设置。

> + **options.prefix:** 路由前缀，可通过[`router.prefix()`](#路由前缀)方法覆盖，默认为`/`
> + **options.methods:** 支持的methods，默认为['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE']
> + **options.parseBody:** 默认情况下，对于`POST`、`PUT`和`PATCH`请求，会自动解析body，也可以自定义[解析body配置](#解析body配置)
> + **options.allowCross:** 是否允许跨域，默认为false，可以简单地设置为true来使用默认配置，也可以自定义[跨域配置](#跨域配置)
> + **options.staticFile:** 默认的[静态文件资源配置](#静态文件资源配置)
> + **options.uploadFile:** 默认的[文件上传配置](#文件上传配置)
> + **options.renderFile:** 默认的[模板渲染配置](#模板渲染配置)
> + **options.swagger:** 默认的[Swagger文档配置](#swagger文档配置)
> + **options.validator:** [参数校验配置](#参数校验配置)，默认为true，可以简单地设置为false来禁用参数校验
> + **options.document:** swagger文档基础配置，具体可以参考[OpenAPI Specification](#https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md)

### 使用路由

路由的实例化虽然是多次的，但是路由的使用却只需要一次。

```javascript
var koa = require('koa');
var Router = require('smart-koa-router');

app.use(router.routes());

app.listen(8444, '0.0.0.0', function() {
    console.log('http://localhost:8444');
});
```

## API

### router.use(methods, path, opts, ...middleware)

定义一个路由拦截行为，统一拦截请求进入时的操作。

```javascript
router.use(['POST', 'PUT', 'PATCH', 'DELETE'], async function authorizeMiddleware(ctx, next) {
    // 所有的增删改操作都要进入权限认证
    await next();
});
```

**参数**

+ methods: String|String[]，接收的request method，如果省略则接收所有的默认允许的methods
+ path: String|RegExp，接收的request path，如果省略则等同于'*'，如果为字符串则表示支持参数

  为了支持swagger的path参数格式，在解析参数时使用了[open-path](http://npmjs.com/open-path)模块来代替`path-to-regexp`
+ opts: 路由配置，与[实例化](#实例化)时的参数配置相同，该参数可以省略，也可以写在middleware的后面
+ middleware: 一个或多个路由处理中间件

### router.param([path], param, middleware)

对指定路径参数作统一拦截，属于router.use()方法的语法糖。

```javascript
router
    .param('user', (id, ctx, next) => {
        ctx.user = users[id];
        if (!ctx.user) return ctx.status = 404;
        return next();
    })
    .get('/users/:user', ctx => {
        ctx.body = ctx.user;
    })
    .get('/users/:user/friends', async (ctx) => {
        var friends = await ctx.user.getFriends();
        ctx.body = friends;
    });
    // /users/3 => {"id": 3, "name": "Alex"}
    // /users/3/friends => [{"id": 4, "name": "TJ"}]
```

### router.prefix(prefix)

定义路由前缀，在此之后定义的路由，只要`path`是以`./`开头的，都会自动加上此前缀。

### router.any(methods, path, opts, ...middleware)

不同于路由拦截，路由定义最多只会命中一个定义的路由，且后定义的路由将覆盖先定义的路由。

**参数**

相比于通用配置，多了一个`opts.annotations`配置，用于描述该路由和校验请求参数，声明方式请参考[operation-object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#operation-object)。

另外还有一个`opts.routeOptions`配置，供中间件调用。

### router.get(path, opts, ...middleware)

定义一个`get`请求，同时会定义一个`head`请求，如果需要自定义`head`请求，只需要手动定义一个`head`请求覆盖掉即可。

### router.post(path, opts, ...middleware)

定义一个`post`请求。

### router.put(path, opts, ...middleware)

定义一个`put`请求。

### router.patch(path, opts, ...middleware)

定义一个`patch`请求。

### router.delete(path, opts, ...middleware)

定义一个`delete`请求。

### router.head(path, opts, ...middleware)

定义一个`head`请求。

### router.options(path, opts, ...middleware)

定义一个`options`请求。

### router.static(methods, path, opts, ...middleware)

通过定制的[koa-send](https://github.com/koajs/send)模块，满足提供静态文件服务的需求。

```javascript
// 单个文件
router.static('/index.html', {
    staticFile: {
        filename: 'index.html',
        root: __dirname
    }
});

// 整个目录
router.static('/assets', {
    staticFile: {
        root: __dirname,
        include: /(css|js|html)$/i
    }
});
```

**参数**

除了methods的默认值为GET外，其余参数无区别。

### router.render(methods, path, opts, ...middleware)

用于提供根据模板渲染页面的能力。

```javascript
router.render(docUrl, {
   renderFile: {
       template: path.resolve(__dirname, 'swagger-ui/index.ejs'),
       data: Object.assign({
           home: '/',
           title: 'Swagger UI',
           pageTitle: 'Swagger',
           url: '/api-docs',
           auth: null
       }, options.swaggerUi)
   }
});
```

**参数**

除了methods的默认值为GET外，其余参数无区别。

**自定义Engine**

请参考[/src/render/engine/ejs-engine.js](/src/render/engine/ejs-engine.js)。

### router.upload(methods, path, opts, ...middleware)

通过定制的[busboy](https://github.com/mscdex/busboy)模块，满足文件上传的需求。并实现了`FileStorage`和`MemoryStorage`来接收处理文件，还支持自定义`Storage`。

```javascript
router.upload('./upload', {
    uploadFile: {
        root: path.resolve(__dirname, 'uploads'),
        allowedFileExts: 'js,png'
    }
}, async (ctx, next) => {
    console.log(ctx.req.body);      // 除type=file外的其它fields
    console.log(ctx.req.files);     // 由Storage返回的文件对象
    console.log(ctx.request.body);  // 等价于 ctx.req.body
    console.log(ctx.request.files); // 等价于 ctx.req.files
    ctx.body = '上传成功!';
});
```

**参数**

除了methods的默认值为POST外，其余参数无区别。

**自定义Storage**

请参考[/src/upload/storage/file.js](/src/upload/storage/file.js)。

### router.redirect(source, target, code)

路由跳转。

**参数**

+ source: 访问路径
+ target: 目标位置
+ code: 状态码，默认为301

### router.beforeStart(callback)

在服务启动之前的通用拦截操作，此时会执行传入的callback。

**参数**

+ callback: Function，待执行的回调函数，入参为已定义的所有routes对象数组。

## ctx

路由在处理过程中会往`koa`的`ctx`对象上塞入一些变量。

#### ctx.route

当前命中路由的实例对象。

### ctx.router

当前的实例化router对象。

### ctx.routeOptions

从路由定义时传入的额外配置参数(opts.routeOptions)，主要是为了在拦截阶段可以根据路由定义的不同routeOptions来分别处理。

### ctx.params

定义在path上的参数解析之后的对象。

### ctx.req.body和ctx.request.body

解析之后得到的body参数。

### ctx.req.files和ctx.request.files

解析之后得到的文件上传对象。

### ctx.req.formData和ctx.request.formData

解析`multipart/form-data`时得到的内容，即`body` + `files`。

## 路由配置

### 解析body配置

> + **parseBody.encoding:** String，字符编码，默认为'utf8'
> + **parseBody.jsonLimit：** Array，`Content-Type`为`application/json`时的body大小，默认不超过2MB
> + **parseBody.formLimit：** Array，`Content-Type`为`application/x-www-form-urlencoded`时的body大小，默认不超过56KB
> + **parseBody.jsonFormats：** Array，`Content-Type`的值，默认为['application/json']
> + **parseBody.formFormats：** Array，`Content-Type`的值，默认为['application/x-www-form-urlencoded']
> + **parseBody.onerror：** Function，解析错误处理回调函数，传入参数为一个错误对象，`this`将指向`Koa`的`context`。如果不指定，则将返回400状态。

### 跨域配置

> + **allowCross.origin:** 设置`Access-Control-Allow-Origin`头，值可以是以下类型：
>   **Boolean** - 为`true`时设置为请求头的`Origin`字段，为`false`时将禁用跨域。
>   **String** - 设置为指定值。例如指定为`http://example.com`时，只有从`http://example.com`发起的请求才能跨域。
>   **RegExp** - 当请求头的`Origin`字段匹配时才能跨域。例如指定为`/example\.com$/`时，所有以`example.com`结尾的网站发过来的跨域请求都将被允许。
>   **Array** - 允许列表中的多个网站跨域。
>   **Function** - 自定义是否允许跨域。第一个参数为请求头的`Origin`字段，第二个参数为一个回调处理函数(回调的第一个参数为err [object]，第二个参数为allow [bool])。
> + **allowCross.methods:** 设置`Access-Control-Allow-Methods`头，值可以是个数组(如: ['GET', 'PUT', 'POST'])或者以英文逗号分隔的字符串(如: 'GET,PUT,POST')。
> + **allowCross.allowedHeaders:** 设置`Access-Control-Allow-Headers`头，值可以是个数组(如: ['Content-Type', 'Authorization'])或者以英文逗号分隔的字符串(如: 'Content-Type,Authorization')。如果未指定该设置，那么将自动使用请求头的`Access-Control-Request-Headers`字段。
> + **allowCross.exposedHeaders:** 设置`Access-Control-Expose-Headers`头，值可以是个数组(如: ['Content-Range', 'X-Content-Range'])或者以英文逗号分隔的字符串(如: 'Content-Range,X-Content-Range')。
> + **allowCross.credentials:** 设置`Access-Control-Allow-Credentials`头，值为true或false(默认为false)。当需要允许跨域传cookie时，需要设置为true。
> + **allowCross.maxAge:** String，设置`Access-Control-Max-Age`头。
> + **allowCross.optionsSuccessStatus:** String，设置`OPTIONS`请求时返回的状态码，默认为204(No Content)。

### 静态文件资源配置

> + **staticFile.maxAge:** 设置浏览器最大缓存时间(毫秒)，默认为0。
> + **staticFile.immutable:** 设置资源是否不会变更，可以永久缓存，默认为false。
> + **staticFile.hidden:** 设置是否允许输出隐藏文件，默认为false。
> + **staticFile.root:** 设置资源文件所在的根目录，必需指定。
> + **staticFile.index:** 设置目录下的默认页，如果设置该值，则当用户直接访问该目录时，会自动跳转到默认页。
> + **staticFile.gzip:** 设置是否自动使用gzip压缩文件(.gz)，默认为true。
> + **staticFile.brotli:** 设置是否自动使用brotli压缩文件(.br)，默认为true。
> + **staticFile.setHeaders:** 设置自定义响应头`Cache-Control`或`Last-Modified`，该方法接受`res, path, stats`三个参数。
> + **staticFile.extensions:** Array，设置自动补全的文件扩展名，默认为false。
> + **staticFile.filename:** 设置静态文件对应的文件名，当为目录时不需要指定该配置。
> + **staticFile.filter:** Function，接收请求的filename，返回true时才能访问该静态资源文件，默认无限制。
> + **staticFile.include:** RegExp，限制允许访问的静态资源文件，当设置了`filter`时该选项将被忽略。
> + **staticFile.exclude:** RegExp，限制不允许访问的静态资源文件，当设置了`filter`时该选项将被忽略。
> + **staticFile.converter:** Function，接收请求的filename，返回对应的本地文件的filename。
> + **staticFile.mapList:** key/value，设置请求的filename到本地文件的映射关系，当设置了`converter`时该选项将被忽略。
> + **staticFile.onerror:** Function，错误处理回调函数，传入参数为一个错误对象，`this`将指向`Koa`的`context`。如果不指定，则将直接抛出该错误。


### 文件上传配置

> + **uploadFile.storage:** Class，上传文件处理类。当指定了`uploadFile.root`时，将使用`FileStorage`保存为本地文件，否则使用`MemoryStorage`保存到内存
> + **uploadFile.allowedFileExts:** String|Array，允许的上传文件名后缀，默认为*
> + **uploadFile.allowedFileNames:** String|Array，允许的上传文件名(即input的name属性)，默认为*
> + **uploadFile.root:** String，文件保存的根目录(绝对路径)
> + **uploadFile.mode:** Number，文件保存目录的权限，默认为0777
> + **uploadFile.multiple:** Boolean，是否允许多文件上传(即input的multiple属性)，默认为false
> + **uploadFile.fieldNameSize:** Number，允许的字段名总大小，默认为100B
> + **uploadFile.fieldValueSize:** Number，允许的字段值总大小，默认为1M
> + **uploadFile.fieldsCount:** Number，允许的字段总个数，默认不限制
> + **uploadFile.fileSize:** Number，允许的字段总个数，默认不限制
> + **uploadFile.fieldsCount:** Number，允许的字段总个数，默认不限制
> + **uploadFile.fieldsCount:** Number，允许的字段总个数，默认不限制
> + **uploadFile.fileSize:** Number，允许的单个文件大小(单位为Byte)，默认10240(即10MB)
> + **uploadFile.filesCount** Number，允许上传的文件个数，默认不限制
> + **uploadFile.partsCount** Number，允许的字段+文件总个数，默认不限制
> + **uploadFile.onerror** Function，上传出错时的处理方式，如果不指定则将直接返回500状态

### 模板渲染配置

> + **renderFile.engine:** Class，模板渲染类。默认为ejs
> + **renderFile.data** Object，传入用于模板渲染的额外数据
> + **renderFile.template** String，模板文件的绝对路径
> + **renderFile.onerror** Function，渲染出错时的处理方式，如果不指定则将直接返回500状态

### Swagger文档配置

> + **swagger.docApi:** String，api文档接口地址，默认为"/api-docs"
> + **swagger.docUrl:** String，swagger页面地址，默认为"/swagger-ui.html"
> + **swagger.swaggerUi:** Object，swagger-ui的相关配置
> + **swagger.swaggerUi.home:** String，首页地址，默认为"/"
> + **swagger.swaggerUi.title:** String，title标签内容
> + **swagger.swaggerUi.pageTitle:** String，页面上显示的标题内容
> + **swagger.swaggerUi.url:** String，api文档接口地址，默认为"/api-docs"
> + **swagger.swaggerUi.auth:** Object，auth配置

### 参数校验配置

> + **validator.onerror** Function，校验不匹配时的处理方式，如果不指定则将直接返回400状态

## 示例

更多使用示例请查看[examples](/examples)目录。

