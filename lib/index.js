'use strict';

const Assert = require('assert');
const Hapi = require('@hapi/hapi');
const Package = require('../package.json');

const internals = {};

exports.plugin = {
    pkg: Package,
    once: true,
    requirements: {
        hapi: '>=20'
    },
    register(server) {

        server.decorate('server', 'instance', function (...args) {

            return exports.instance(this, ...args);
        });
    }
};

exports.toFactory = (plugin) => {

    return async (maybeServer, ...args) => {

        if (internals.isServer(maybeServer)) {
            return await exports.instance(maybeServer, plugin, ...args);
        }

        return await exports.instance(plugin, maybeServer, ...args);
    };
};

exports.instance = async (server, plugin, options, compose) => {

    if (!internals.isServer(server)) {
        compose = options;
        options = plugin;
        plugin = server;
        server = null;
    }

    plugin = plugin.plugin || plugin;
    options = options || {};
    compose = compose || {};

    const {
        server: srvOptions,
        register,
        controlled = Boolean(server),
        initialize = Boolean(!server),
        decorateRoot = Boolean(controlled || !server),
        decorateController = Boolean(controlled)
    } = compose;

    const { plugins, options: pluginOptions } = (register && !register.plugins) ? { plugins: register } : (register || {});

    Assert.ok(server || !controlled, 'A server must be specified when compose.controlled is true.');
    Assert.ok(!srvOptions || (controlled || !server), 'When a server is specified but compose.controlled is false, compose.server options are not allowed, as a new server will not be created.');

    const srv = (!controlled && server) ? server : Hapi.server(srvOptions);

    if (controlled) {
        server.control(srv);
    }

    if (plugins) {
        await srv.register(plugins, pluginOptions);
    }

    const { register: pluginRegister, ...attributes } = plugin;

    let instance;

    await srv.register({
        plugin: {
            ...attributes,
            register: (...args) => {

                instance = args[0];

                return pluginRegister.call(plugin, ...args);
            }
        },
        // Allow { ...pluginOpts } or { options: pluginOpts, once, routes }
        ...(options.options ? options : { options })
    });

    if (decorateRoot) {

        Assert.ok(!srv.realm.parent, 'Cannot use compose.decorateRoot option without access to a root server.');
        Assert.ok(!srv.decorations.server.includes('root') || srv.root === srv, 'Cannot use compose.decorateRoot on a server that already has a different root decoration.');

        if (!srv.root) {
            srv.decorate('server', 'root', srv);
        }
    }

    if (decorateController) {

        Assert.ok(controlled, 'Cannot use compose.decorateController option when the instance is not controlled.');
        Assert.ok(!srv.decorations.server.includes('controller'), 'Cannot use compose.decorateController on a server that already has a controller decoration.');

        srv.decorate('server', 'controller', server);
    }

    if (initialize) {
        if (server) {
            await server.initialize();
        }
        else {
            await srv.initialize();
        }
    }

    return instance;
};

internals.serverPrototype = Object.getPrototypeOf(Hapi.server());

internals.isServer = (server) => {

    return server && (Object.getPrototypeOf(server) === internals.serverPrototype);
};
