# ahem
hapi plugins as libraries

[![Build Status](https://travis-ci.org/hapipal/ahem.svg?branch=master)](https://travis-ci.org/hapipal/ahem) [![Coverage Status](https://coveralls.io/repos/hapipal/ahem/badge.svg?branch=master&service=github)](https://coveralls.io/github/hapipal/ahem?branch=master)

Lead Maintainer - [Devin Ivy](https://github.com/devinivy)

## Installation
```sh
npm install @hapipal/ahem
```

## Usage
> See also the [API Reference](API.md)
>
> Ahem is intended for use with hapi v19+ and nodejs v12+ (_see v1 for lower support_).  Ensure you've installed @hapi/hapi within your project.

Ahem's purpose is to encourage new possibilites for hapi plugin composition and portability.  It's a small tool that offers only subtly different functionality from [glue](https://github.com/hapijs/glue); but unlike glue, ahem's API is designed to strongly reinforce the perspective of hapi plugins as being instantiable general-purpose libraries, and not just web servers.

Ahem has applications in building non-server projects using hapi, creating servers with multiple connections, safely sharing functionality across plugins, and testing hapi plugins (particularly complex application plugins that use [schwifty](https://github.com/hapipal/schwifty) models or [schmervice](https://github.com/hapipal/schmervice) services).  Finally, ahem is compatible with schmervice, and plugins can be used as services under schmervice.  We think the collection of examples below should help to illustrate.

### Examples

#### Treat vision as a library

The most basic usage of ahem is to instance a plugin with some plugin options.  Here we treat vision as an adapter-based templating library rather than as a hapi plugin.

```js
// npm install @hapipal/ahem @hapi/hapi @hapi/vision handlebars
const Vision = require('@hapi/vision');
const Handlebars = require('handlebars');
const Ahem = require('@hapipal/ahem');

// Before continuing, create a template:
// mkdir templates && echo 'Hello, {{name}}!' > templates/hello.hbs

(async () => {

    const vision = await Ahem.instance(Vision, {
        engines: { hbs: Handlebars },
        relativeTo: __dirname,
        path: 'templates'
    });

    const message = await vision.render('hello', { name: 'Clarice' });

    console.log(message); // Hello, Clarice!
})();
```

#### Instantiate your application with its dependencies

If your application has external plugin dependencies then you can specify those using the `register` option.

```js
// npm install @hapipal/ahem @hapi/hapi @hapipal/schwifty knex sqlite3
const Schwifty = require('@hapipal/schwifty');
const Ahem = require('@hapipal/ahem');
const App = require('./app');

// Below assumes your application plugin
// uses schwifty and has an objection Users model.

(async () => {

    const app = await Ahem.instance(App, {}, {
        register: [
            {
                plugin: Schwifty,
                options: {
                    knex: {
                        client: 'sqlite3',
                        useNullAsDefault: true,
                        connection: {
                            filename: ':memory:'
                        }
                    }
                }
            }
        ]
    });

    const { Users } = app.model();

    const paldo = await Users.query().insertAndFetch({ name: 'paldo' });

    console.log(paldo);
})();
```

#### Instantiate your application, controlled by a server

You might want to use one of your application plugins within a separate hapi project or deployment.  In this case you usually want the instance of your application to be "tied" to the lifecycle of the primary hapi server of that project: when you initialize/start/stop the primary server you would like your application instance to do the same.  In hapi jargon you want your application to be "controlled" by that server (see [`server.control()`](https://hapi.dev/api#-servercontrolserver) for more info).  Ahem can take care of this for you, if you simply provide the primary server as an argument.

```js
// npm install @hapipal/ahem @hapi/hapi
const Hapi = require('@hapi/hapi');
const Ahem = require('@hapipal/ahem');
const App = require('./app');

(async () => {

    const server = Hapi.server();

    const app = await Ahem.instance(server, App);

    // app is not yet initialized

    await server.initialize();

    // app is now initialized too

    await server.stop();

    // app is now stopped too
})();
```

##### Using ahem as a plugin for controlled usage

Ahem can also be used as a plugin, e.g. for repeated "controlled" usage by the same server.  This style emphasizes the relationship between hapi's plugin registration with `server.register()` versus ahem's plugin instancing: the former has a major effect on `server` and the latter does not.  An equivalent way to write the above example using ahem as a plugin would look like this.

```js
// npm install @hapipal/ahem @hapi/hapi
const Hapi = require('@hapi/hapi');
const Ahem = require('@hapipal/ahem');
const App = require('./app');

(async () => {

    const server = Hapi.server();

    await server.register(Ahem);

    const app = await server.instance(App);

    // app is not yet initialized

    await server.initialize();

    // app is now initialized too

    await server.stop();

    // app is now stopped too
})();
```

#### Treat vision as a service

Schmervice recognizes hapi plugin instances as valid services, which means that you can register an instance created by ahem with schmervice without any friction.  Schmervice will use the name of the plugin (i.e. it's `name` attribute) as the service's name by default.  You can specify a different name using [`Schmervice.withName()`](https://github.com/hapipal/schmervice/blob/master/API.md#schmervicewithnamename-servicefactory) if desired.

```js
// npm install @hapipal/ahem schmervice @hapi/hapi @hapi/vision handlebars
const Hapi = require('@hapi/hapi');
const Vision = require('@hapi/vision');
const Handlebars = require('handlebars');
const Schmervice = require('@hapipal/schmervice');
const Ahem = require('@hapipal/ahem');

// Before continuing, create a template:
// mkdir templates && echo 'Hello, {{name}}!' > templates/hello.hbs

(async () => {

    const server = Hapi.server();

    await server.register(Schmervice);

    const vision = await Ahem.instance(Vision, {
        engines: { hbs: Handlebars },
        relativeTo: __dirname,
        path: 'templates'
    })

    server.registerService(vision);

    const { vision: templatingService } = server.services();

    const message = await templatingService.render('hello', { name: 'Clarice' });

    console.log(message); // Hello, Clarice!
})();
```

#### Deploy a server with many connections

In hapi v17 hapi [dropped support](https://github.com/hapijs/hapi/issues/3572) for multiple connections.  Ahem offers a convenient way to reintroduce multiple connections to your project.  Below we demonstrate the use-case of redirecting HTTP to HTTPS in a single process using the `server` option to specify a port.  Note that this is another example of "controlled" usage similar to [this example](#instantiate-your-application-controlled-by-a-server) above.

```js
// npm install @hapipal/ahem @hapi/hapi hapi-require-https
const Fs = require('fs');
const Hapi = require('@hapi/hapi');
const Ahem = require('@hapipal/ahem');
const RequireHttps = require('hapi-require-https');
const App = require('./app');

// Note, the example below utilizes ports 80 and 443 which
// typically require special privileges. It's more common
// to deploy node behind a reverse proxy in production.

(async () => {

    const server = Hapi.server({
        port: 443,
        tls: {
            key: Fs.readFileSync('key.pem'),
            cert: Fs.readFileSync('cert.pem')
        }
    });

    await server.register(App);

    await Ahem.instance(server, RequireHttps, {
        proxy: false    // See https://github.com/bendrucker/hapi-require-https#proxy
    }, {
        server: {
            port: 80
        }
    });

    await server.start();

    console.log(`Server started at ${server.info.uri}`);
})();
```

#### Instance vision as a factory

Ahem offers an additional style for wrapping hapi plugins into a library: you can turn a plugin into a factory for an instance using [`Ahem.toFactory(plugin)`](API.md#ahemtofactoryplugin).

```js
// npm install @hapipal/ahem @hapi/hapi @hapi/vision handlebars
const Vision = require('@hapi/vision');
const Handlebars = require('handlebars');
const Ahem = require('@hapipal/ahem');

// Before continuing, create a template:
// mkdir templates && echo 'Hello, {{name}}!' > templates/hello.hbs

(async () => {

    const createVision = Ahem.toFactory(Vision);

    const vision = await createVision({
        engines: { hbs: Handlebars },
        relativeTo: __dirname,
        path: 'templates'
    });

    const message = await vision.render('hello', { name: 'Clarice' });

    console.log(message); // Hello, Clarice!
})();
```

#### Advanced usage

Ahem has a handful of other options that can be used too.  Check out the [API Reference](API.md) for more info.

```js
// npm install @hapipal/ahem @hapi/hapi @hapi/vision handlebars
const Vision = require('@hapi/vision');
const Handlebars = require('handlebars');
const Ahem = require('@hapipal/ahem');

// Before continuing, create a template:
// mkdir templates && echo 'Hello, {{name}}!' > templates/hello.hbs

(async () => {

    const server = Hapi.server();

    await Ahem.instance(server, Vision, {
        engines: { hbs: Handlebars },
        relativeTo: __dirname,
        path: 'templates'
    }, {
        controlled: false,
        initialize: true,
        decorateRoot: false,
        decorateControlled: false
    });

    const message = await server.render('hello', { name: 'Clarice' });

    console.log(message); // Hello, Clarice!
})();
```
