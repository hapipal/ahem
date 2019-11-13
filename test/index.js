'use strict';

// Load modules

const Lab = require('@hapi/lab');
const Code = require('@hapi/code');
const Hapi = require('@hapi/hapi');
const Ahem = require('..');

// Test shortcuts

const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;

const internals = {};

describe('Ahem', () => {

    describe('instance()', () => {

        // A little guide behavioral guide to ahem:
        //
        // server    x controlled      = control-by:server  [and] register-to:new-server
        // server    x not-controlled  = control-by:n/a     [and] register-to:server (no server options allowed)
        // no-server x controlled      = (not-allowed)
        // no-server x not-controlled  = control-by:n/a     [and] register-to:new-server

        it('instances a plugin.', async () => {

            let srv;

            const plugin = await Ahem.instance({
                name: 'my-plugin',
                register: (server, options) => {

                    srv = server;

                    expect(options).to.equal({});
                }
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);
        });

        it('instances a plugin in { plugin } format.', async () => {

            let srv;

            const plugin = await Ahem.instance({
                other: 'junk',
                plugin: {
                    name: 'my-plugin',
                    register: (server, options) => {

                        srv = server;

                        expect(options).to.equal({});
                    }
                }
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);
        });

        it('instances a plugin with options.', async () => {

            let srv;

            const plugin = await Ahem.instance({
                name: 'my-plugin',
                register: (server, options) => {

                    srv = server;

                    expect(options).to.equal({
                        some: 'options'
                    });
                }
            }, {
                some: 'options'
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);
        });

        it('instances a plugin with options and registration options.', async () => {

            let srv;

            const plugin = await Ahem.instance({
                name: 'my-plugin',
                register: (server, options) => {

                    srv = server;

                    expect(options).to.equal({
                        some: 'options'
                    });

                    expect(server.realm.modifiers.route.prefix).to.equal('/x');
                }
            }, {
                options: {
                    some: 'options'
                },
                routes: {
                    prefix: '/x'
                }
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);
        });

        it('fails when using compose.controlled without a primary server.', async () => {

            const pluginPromise = Ahem.instance({
                name: 'my-plugin',
                register: () => {}
            }, null, {
                controlled: true
            });

            await expect(pluginPromise).to.reject('A server must be specified when compose.controlled is true.');
        });

        it('registers additional plugins using the compose.register option for a single plugin.', async () => {

            let srv;

            const plugin = await Ahem.instance({
                name: 'my-plugin',
                register: (server) => {

                    srv = server;

                    expect(server.registrations).to.only.include(['my-plugin', 'some-dependency']);
                }
            }, null, {
                register: {
                    plugins: {
                        name: 'some-dependency',
                        register: () => null
                    }
                }
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);
        });

        it('registers additional plugins using the compose.register option for multiple plugins.', async () => {

            let srv;

            const plugin = await Ahem.instance({
                name: 'my-plugin',
                register: (server) => {

                    srv = server;

                    expect(server.registrations).to.only.include(['my-plugin', 'some-dependency', 'some-other-dependency']);
                    expect(server.realm.modifiers.route.prefix).to.not.exist();
                }
            }, null, {
                register: {
                    plugins: [
                        {
                            plugin: {
                                name: 'some-dependency',
                                register: (server, options) => {

                                    expect(options).to.equal({
                                        some: 'options'
                                    });

                                    expect(server.realm.modifiers.route.prefix).to.equal('/x');
                                }
                            },
                            options: {
                                some: 'options'
                            }
                        },
                        {
                            name: 'some-other-dependency',
                            register: (server) => {

                                expect(server.realm.modifiers.route.prefix).to.equal('/x');
                            }
                        }
                    ],
                    options: {
                        routes: {
                            prefix: '/x'
                        }
                    }
                }
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);
        });

        it('instances a plugin with a server provided compose.server options.', async () => {

            let srv;

            const plugin = await Ahem.instance({
                name: 'my-plugin',
                register: (server) => {

                    srv = server;
                }
            }, null, {
                server: {
                    app: {
                        some: 'value'
                    }
                }
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);
            expect(plugin.settings.app).to.equal({ some: 'value' });
        });

        it('instances a plugin controlled by a root server.', async () => {

            let srv;

            const root = Hapi.server();
            const plugin = await Ahem.instance(root, {
                name: 'my-plugin',
                register: (server) => {

                    srv = server;

                    server.ext('onPreStart', () => {

                        server.app.some = 'value';
                    });
                }
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);

            expect(plugin).to.not.shallow.equal(root);
            expect(root.registrations).to.not.include('my-plugin');
            expect(plugin.realm.parent).to.not.shallow.equal(root.realm);

            expect(plugin.app).to.equal({});
            await root.initialize();
            expect(plugin.app).to.equal({ some: 'value' });
            expect(root.app).to.not.equal({ some: 'value' });
        });

        it('instances a plugin created with compose.server options, controlled by a root server.', async () => {

            let srv;

            const root = Hapi.server();
            const plugin = await Ahem.instance(root, {
                name: 'my-plugin',
                register: (server) => {

                    srv = server;

                    server.ext('onPreStart', () => {

                        server.app.some = 'value';
                    });
                }
            }, null, {
                server: {
                    app: {
                        some: 'value'
                    }
                }
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);

            expect(plugin).to.not.shallow.equal(root);
            expect(root.registrations).to.not.include('my-plugin');
            expect(plugin.realm.parent).to.not.shallow.equal(root.realm);

            expect(plugin.settings.app).to.equal({ some: 'value' });
            expect(root.settings.app).to.not.equal({ some: 'value' });

            expect(plugin.app).to.equal({});
            await root.initialize();
            expect(plugin.app).to.equal({ some: 'value' });
            expect(root.app).to.not.equal({ some: 'value' });
        });

        it('instances a plugin by a root server via registration when compose.controlled is false.', async () => {

            let srv;

            const root = Hapi.server();
            const plugin = await Ahem.instance(root, {
                name: 'my-plugin',
                register: (server) => {

                    srv = server;

                    server.ext('onPreStart', () => {

                        server.app.some = 'value';
                    });
                }
            }, null, {
                controlled: false,
                register: {
                    plugins: {
                        name: 'some-dependency',
                        register: () => null
                    }
                }
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);

            expect(plugin).to.not.shallow.equal(root);
            expect(root.registrations).to.only.include(['my-plugin', 'some-dependency']);
            expect(plugin.realm.parent).to.shallow.equal(root.realm);

            expect(plugin.app).to.equal({});
            await root.initialize();
            expect(plugin.app).to.equal({ some: 'value' });
            expect(root.app).to.equal({ some: 'value' });
        });

        it('fails when using compose.server options and passing a root server while compose.controlled is false.', async () => {

            const pluginPromise = Ahem.instance(Hapi.server(), {
                name: 'my-plugin',
                register: () => null
            }, null, {
                controlled: false,
                server: {
                    app: {
                        some: 'value'
                    }
                }
            });

            await expect(pluginPromise).to.reject('When a server is specified but compose.controlled is false, compose.server options are not allowed, as a new server will not be created.');
        });
    });

    describe('plugin', () => {

        it('x.', () => {});
    });
});
