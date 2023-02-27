# API

Utilities for treating hapi plugins as standalone libraries.

> **Note**
>
> Ahem is intended for use with hapi v20+ and nodejs v16+ (_see v2 for lower support_).  Ensure you've installed @hapi/hapi within your project.

## `Ahem`
### `await Ahem.instance([server], plugin, [options, [compose]])`

Returns an instance of `plugin`, i.e. a [plugin-server](#plugin-server), where `plugin` is a hapi plugin.

 - `server` - an optional hapi server, typically used to [control](https://hapi.dev/api/#-servercontrolserver) the returned plugin instance.  See also `compose.controlled` below.
 - `plugin` - a [hapi plugin](https://hapi.dev/api/#plugins).
 - `options` - plugin options for `plugin`.
 - `compose` - options related to the composition of `server`, `plugin`, and the returned plugin instance.
   - `compose.server` - hapi [server options](https://hapi.dev/api/#server.options).  These options will be used to create the root server for `plugin` to live on.  Note that this cannot be set when `server` is passed but `compose.controlled` is `false`: in that case `plugin` is registered directly to `server`, and an additional hapi server will not be created.
   - `compose.register` - additional plugins to register to the same server as `plugin`, usually to fulfill `plugin`'s dependencies.  This may take the shape `{ plugins, options }` or just `plugins`, where `plugins` and `options` are defined as the arguments to [`server.register(plugins, [options])`](https://hapi.dev/api/#-await-serverregisterplugins-options).
   - `compose.controlled` - when a `server` is specified but this is set to `false`, `plugin` will be registered directly to `server`.  By default `plugin` will be instanced on a separate server, but [controlled](https://hapi.dev/api/#-servercontrolserver) by `server`, meaning that it's tied to `server`'s initialize/start/stop lifecycle.
   - `compose.initialize` - may be set to `true` or `false` to determine whether to [initialize](https://hapi.dev/api/#-await-serverinitialize) the plugin instance.  In a controlled situation (per `compose.controlled`) this option defaults to `false`; when set to `true`, `server` will be initialized (in turn the plugin instance is also intialized).  In a non-controlled situation this option defaults to `true`; when set to `false`, the returned plugin instance will not be initialized.
   - `compose.decorateRoot` - determines whether or not the returned plugin instance should have a `root` [decoration](https://hapi.dev/api/#-serverdecoratetype-property-method-options) that references the root server to which it is registered.  Defaults to `true` unless `server` is specified but `compose.controlled` is `false`.
   - `compose.decorateController` - determines whether or not the returned plugin instance should have a `controller` [decoration](https://hapi.dev/api/#-serverdecoratetype-property-method-options) that references the controlling `server`.  Defaults to `true` when in a controlled situation (per `compose.controlled`).

#### Example

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

### `Ahem.toFactory(plugin)`

Returns a function `async function([server], [options, [compose]])` identical in behavior to [`Ahem.instance([server], plugin, [options, [compose]])`](#await-aheminstanceserver-plugin-options-compose) but with `plugin` fixed.  This allows hapi plugins to easily provide an interface for standalone usage.

#### Example

```js
// my-plugin.js
const Ahem = require('@hapipal/ahem');

exports.plugin = {
    name: 'my-plugin',
    register(server, options) {
        // ...
    }
};

exports.create = Ahem.toFactory(exports.plugin);
```

```js
// index.js
const Hapi = require('@hapi/hapi');
const MyPlugin = require('./my-plugin');

(async () => {

    // Your plugin can be used without explicitly utilizing hapi or ahem:

    const app = await MyPlugin.create({/* options */});

    // Or it can be registered normally as a hapi plugin:

    const server = Hapi.server();

    await server.register({
        plugin: MyPlugin,
        options: {/* options */}
    });
})();
```

## The hapi plugin
The purpose of this plugin is to expose the functionality of [`Ahem.instance()`](#await-aheminstanceserver-plugin-options-compose) as [a server decoration](#await-serverinstanceplugin-options-compose).

### Registration
Ahem may be registered multiple times—it should be registered in any plugin that would like to use any of its features.  It takes no plugin options.

### Server decorations
#### `await server.instance(plugin, [options, [compose]])`
Identical in behavior to [`Ahem.instance([server], plugin, [options, [compose]])`](#await-aheminstanceserver-plugin-options-compose) but with `server` fixed.  This is typically used to instance `plugin` while ensuring it's [controlled](https://hapi.dev/api/#-servercontrolserver) by `server`.  It can be thought of as the less effectful version of [`server.register()`](https://hapi.dev/api/#server.register()): rather than registering `plugin` to `server`, we instead create an instance of `plugin` and tie it to `server`'s initialize/start/stop lifecycle.

##### Example

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

## Glossary

### Plugin-server

```js
// This is a hapi plugin
exports.plugin = {
    name: 'my-plugin',
    register(server, options) {
        //   ^^^^^^ This is a plugin-server
    }
};
```

If you've written a hapi plugin then you're already familiar with this idea, although you might not have a name for it.  Every hapi plugin defines a `register()` function: `async register(server, options)`.  The `server` passed to this function by hapi is what we call the "plugin-server."  It is different from the server returned by [`Hapi.server()`](https://hapi.dev/api/#-serveroptions), sometimes called the "root server", because plugin-servers are scoped to a [realm](https://hapi.dev/api/#-serverrealm) created by hapi specific to the registration of that plugin.
