'use strict';

const Hapi = require('@hapi/hapi');
const Hoek = require('@hapi/hoek');
const Package = require('../package.json');

const internals = {};

exports.plugin = {
    pkg: Package,
    once: true,
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

    Hoek.assert(server || !controlled, 'A server must be specified when compose.controlled is true.');
    Hoek.assert(!srvOptions || (controlled || !server), 'When a server is specified but compose.controlled is false, compose.server options are not allowed, as a new server will not be created.');

    const srv = (!controlled && server) ? server : internals.server(srvOptions);

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

        Hoek.assert(!srv.realm.parent, 'Cannot use compose.decorateRoot option without access to a root server.');
        Hoek.assert(!srv.decorations.server.includes('root') || srv.root === srv, 'Cannot use compose.decorateRoot on a server that already has a different root decoration.');

        if (!srv.root) {
            srv.decorate('server', 'root', srv);
        }
    }

    if (decorateController) {

        Hoek.assert(controlled, 'Cannot use compose.decorateController option when the instance is not controlled.');
        Hoek.assert(!srv.decorations.server.includes('controller'), 'Cannot use compose.decorateController on a server that already has a controller decoration.');

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

exports._setHapi = (hapi) => {
    // This is just for testing, and may disappear in the future
    internals.server = hapi.server;
    internals.serverPrototype = Object.getPrototypeOf(hapi.server());
};

exports._setHapi(Hapi);

internals.isServer = (server) => {

    return server && (Object.getPrototypeOf(server) === internals.serverPrototype);
};
