'use strict';

const Hapi = require('@hapi/hapi');
const Hoek = require('@hapi/hoek');

const internals = {};

module.exports = async (server, plugin, options, compose) => {

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
        register: { plugins, options: pluginOptions } = {},
        controlled = Boolean(server),
        decorateRoot = Boolean(controlled || !server)
    } = compose;

    // server    x controlled      = control-by:server  [and] register-to:new-server
    // server    x not-controlled  = control-by:n/a     [and] register-to:server (no server options allowed)
    // no-server x controlled      = (not-allowed)
    // no-server x not-controlled  = control-by:n/a     [and] register-to:new-server

    Hoek.assert(server || !controlled, 'A server must be specified when compose.controlled is true.');
    Hoek.assert(!srvOptions || (controlled || !server), 'When a server is specified but compose.controlled is false, compose.server options are not allowed, as a new server will not be created.');

    const srv = (!controlled && server) ? server : Hapi.server(srvOptions);

    if (controlled) {
        server.control(srv);
    }

    if (plugins) {
        await srv.register(plugins, pluginOptions);
    }

    const { register, ...attributes } = plugin;

    let instance;

    await srv.register({
        plugin: {
            ...attributes,
            register: (...args) => {

                instance = args[0];

                return register.call(plugin, ...args);
            }
        },
        options,                        // Allow { ...pluginOpts }
        ...(options.options && options) // or { options: pluginOpts, once, routes }
    });

    if (decorateRoot) {
        Hoek.assert(!srv.realm.parent, 'Cannot use compose.decorateRoot option without access to a root server.')
        srv.decorate('root', srv);
    }

    return instance;
};

internals.isServer = (server) => {

    return Object.getPrototypeOf(server) === Object.getPrototypeOf(Hapi.server());
};
