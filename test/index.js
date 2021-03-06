'use strict';

// Load modules

const Lab = require('@hapi/lab');
const Code = require('@hapi/code');
const Hapi = require('@hapi/hapi');
const Ahem = require('..');

// Test shortcuts

const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;

describe('Ahem', () => {

    describe('instance()', () => {

        // A little behavioral guide to ahem:
        //
        // server    x controlled      = control-by:server  [and] register-to:new-server
        //                                                  [and] initialize:server, not by default
        // server    x not-controlled  = control-by:n/a     [and] register-to:server (no server options allowed)
        //                                                  [and] initialize:server, not by default
        // no-server x controlled      = (not-allowed)
        // no-server x not-controlled  = control-by:n/a     [and] register-to:new-server
        //                                                  [and] initialize:new-server, by default

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

        it('registers additional plugins using the compose.register option with unwrapped single plugin.', async () => {

            let srv;

            const plugin = await Ahem.instance({
                name: 'my-plugin',
                register: (server) => {

                    srv = server;

                    expect(server.registrations).to.only.include(['my-plugin', 'some-dependency']);
                }
            }, null, {
                register: {
                    name: 'some-dependency',
                    register: () => null
                }
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);
        });

        it('registers additional plugins using the compose.register option with unwrapped multiple plugins.', async () => {

            let srv;

            const plugin = await Ahem.instance({
                name: 'my-plugin',
                register: (server) => {

                    srv = server;

                    expect(server.registrations).to.only.include(['my-plugin', 'some-dependency', 'some-other-dependency']);
                    expect(server.realm.modifiers.route.prefix).to.not.exist();
                }
            }, null, {
                register: [
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
                        },
                        routes: {
                            prefix: '/x'
                        }
                    },
                    {
                        name: 'some-other-dependency',
                        register: () => null
                    }
                ]
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

        it('decorates the instance\'s root server by default when controlled by a passed server.', async () => {

            const server = Hapi.server();
            const plugin = await Ahem.instance(server, {
                name: 'my-plugin',
                register: (srv) => {

                    expect(srv.root).to.not.exist();
                }
            }, null, {
                controlled: true
            });

            expect(server.decorations.server).to.not.contain('root');
            expect(plugin.decorations.server).to.contain('root');
            expect(plugin.root.realm).to.shallow.equal(plugin.realm.parent);
        });

        it('decorates the instance\'s root server by default when not passed a server.', async () => {

            const plugin = await Ahem.instance({
                name: 'my-plugin',
                register: (srv) => {

                    expect(srv.root).to.not.exist();
                }
            });

            expect(plugin.decorations.server).to.contain('root');
            expect(plugin.root.realm).to.shallow.equal(plugin.realm.parent);
        });

        it('disables root server decoration by setting compose.decorateRoot to false.', async () => {

            const server = Hapi.server();
            const plugin1 = await Ahem.instance(server, {
                name: 'my-plugin',
                register: () => null
            }, null, {
                controlled: true,
                decorateRoot: false
            });

            expect(server.decorations.server).to.not.contain('root');
            expect(plugin1.decorations.server).to.not.contain('root');

            const plugin2 = await Ahem.instance({
                name: 'my-plugin',
                register: () => null
            }, null, {
                decorateRoot: false
            });

            expect(plugin2.decorations.server).to.not.contain('root');
        });

        it('does not use compose.decorateRoot by default when passed a non-controlling, non-root server.', async () => {

            const server = await Ahem.instance({
                name: 'non-root-server',
                register: () => null
            }, null, {
                decorateRoot: false
            });

            const plugin = await Ahem.instance(server, {
                name: 'my-plugin',
                register: (srv) => {

                    expect(srv.root).to.not.exist();
                }
            }, null, {
                controlled: false
            });

            expect(plugin.decorations.server).to.not.contain('root');
        });

        it('fails when using compose.decorateRoot when passed a non-controlling, non-root server.', async () => {

            const server = await Ahem.instance({
                name: 'non-root-server',
                register: () => null
            }, null, {
                decorateRoot: false
            });

            const pluginPromise = Ahem.instance(server, {
                name: 'my-plugin',
                register: (srv) => {

                    expect(srv.root).to.not.exist();
                }
            }, null, {
                controlled: false,
                decorateRoot: true
            });

            await expect(pluginPromise).to.reject('Cannot use compose.decorateRoot option without access to a root server.');
        });

        it('doesn\'t decorate root server when using compose.decorateRoot and the decoration has already been set.', async () => {

            const root = Hapi.server();

            const plugin1 = await Ahem.instance(root, {
                name: 'my-plugin1',
                register: () => null
            }, null, {
                controlled: false,
                decorateRoot: true
            });

            expect(root.root).to.shallow.equal(root);
            expect(plugin1.root).to.shallow.equal(root);

            // Decoration skipped the second time, otherwise hapi would throw.

            const plugin2 = await Ahem.instance(root, {
                name: 'my-plugin2',
                register: () => null
            }, null, {
                controlled: false,
                decorateRoot: true
            });

            expect(root.root).to.shallow.equal(root);
            expect(plugin2.root).to.shallow.equal(root);
        });

        it('fails when using compose.decorateRoot and there\'s already a different root decoration.', async () => {

            const root = Hapi.server();
            root.decorate('server', 'root', null);

            const pluginPromise = Ahem.instance(root, {
                name: 'my-plugin1',
                register: () => null
            }, null, {
                controlled: false,
                decorateRoot: true
            });

            await expect(pluginPromise).to.reject('Cannot use compose.decorateRoot on a server that already has a different root decoration.');
        });

        it('initializes instance by default when no server is specified.', async () => {

            let initialized = false;

            await Ahem.instance({
                name: 'my-plugin',
                register: (server) => {

                    server.ext('onPreStart', () => {

                        initialized = true;
                    });
                }
            });

            expect(initialized).to.equal(true);
        });

        it('doesn\'t initialize instance when no server is specified and controlled.initialize is false.', async () => {

            let initialized = false;

            await Ahem.instance({
                name: 'my-plugin',
                register: (server) => {

                    server.ext('onPreStart', () => {

                        initialized = true;
                    });
                }
            }, null, {
                initialize: false
            });

            expect(initialized).to.equal(false);
        });

        it('doesn\'t initialize instance by default when a server is specified.', async () => {

            const initialized = { root: false, plugin: false };
            const root = Hapi.server();

            root.ext('onPreStart', () => {

                initialized.root = true;
            });

            await Ahem.instance(root, {
                name: 'my-plugin',
                register: (server) => {

                    server.ext('onPreStart', () => {

                        initialized.plugin = true;
                    });
                }
            });

            expect(initialized).to.equal({ root: false, plugin: false });
        });

        it('initializes instance when a server is specified and compose.initialize is true.', async () => {

            const initialized = { root: false, plugin: false };
            const root = Hapi.server();

            root.ext('onPreStart', () => {

                initialized.root = true;
            });

            await Ahem.instance(root, {
                name: 'my-plugin',
                register: (server) => {

                    server.ext('onPreStart', () => {

                        initialized.plugin = true;
                    });
                }
            }, null, {
                initialize: true
            });

            expect(initialized).to.equal({ root: true, plugin: true });
        });
    });

    describe('plugin', () => {

        it('adds the instance() server decoration.', async () => {

            const server = Hapi.server();

            await server.register(Ahem);

            expect(server.registrations).to.only.include('@hapipal/ahem');
            expect(server.decorations.server).to.only.contain('instance');
        });

        it('can be registered several times.', async () => {

            const server = Hapi.server();

            await server.register(Ahem);

            await expect(server.register(Ahem)).to.not.reject();
        });

        describe('instance() server decoration', () => {

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
                }, {
                    some: 'option'
                });

                expect(plugin).to.exist();
                expect(plugin).to.shallow.equal(srv);

                expect(plugin.realm.pluginOptions).to.equal({ some: 'option' });

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
                await root.register(Ahem);

                const plugin = await root.instance({
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
                await root.register(Ahem);

                const plugin = await root.instance({
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
                expect(root.registrations).to.only.include(['@hapipal/ahem', 'my-plugin', 'some-dependency']);
                expect(plugin.realm.parent).to.shallow.equal(root.realm);

                expect(plugin.app).to.equal({});
                await root.initialize();
                expect(plugin.app).to.equal({ some: 'value' });
                expect(root.app).to.equal({ some: 'value' });
            });

            it('decorates the instance\'s root server by default when controlled by a passed server.', async () => {

                const server = Hapi.server();
                await server.register(Ahem);

                const plugin = await server.instance({
                    name: 'my-plugin',
                    register: (srv) => {

                        expect(srv.root).to.not.exist();
                    }
                }, null, {
                    controlled: true
                });

                expect(server.decorations.server).to.not.contain('root');
                expect(plugin.decorations.server).to.contain('root');
                expect(plugin.root.realm).to.shallow.equal(plugin.realm.parent);
            });
        });
    });

    describe('toFactory()', () => {

        it('creates a function that instances a plugin.', async () => {

            let srv;
            let initialized = false;

            const createPlugin = Ahem.toFactory({
                name: 'my-plugin',
                register: (server, options) => {

                    srv = server;

                    expect(options).to.equal({});

                    server.ext('onPreStart', () => {

                        initialized = true;
                    });
                }
            });

            const plugin = await createPlugin();

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);
            expect(initialized).to.equal(true);
        });

        it('creates a function that instances a plugin with additional arguments.', async () => {

            let srv;
            let initialized = false;

            const createPlugin = Ahem.toFactory({
                name: 'my-plugin',
                register: (server, options) => {

                    srv = server;

                    expect(options).to.equal({ some: 'options' });

                    server.ext('onPreStart', () => {

                        initialized = true;
                    });
                }
            });

            const plugin = await createPlugin({ some: 'options' }, {
                initialize: false
            });

            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);
            expect(initialized).to.equal(false);
        });

        it('creates a function that instances a plugin with a server.', async () => {

            let srv;
            const initialized = { root: false, plugin: false };

            const createPlugin = Ahem.toFactory({
                name: 'my-plugin',
                register: (server, options) => {

                    srv = server;

                    expect(options).to.equal({});

                    server.ext('onPreStart', () => {

                        initialized.plugin = true;
                    });
                }
            });

            const root = Hapi.server();

            root.ext('onPreStart', () => {

                initialized.root = true;
            });

            const plugin = await createPlugin(root);

            expect(initialized).to.equal({ root: false, plugin: false });
            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);

            await root.initialize();

            expect(initialized).to.equal({ root: true, plugin: true });
        });

        it('creates a function that instances a plugin with a server and additional arguments.', async () => {

            let srv;
            const initialized = { root: false, plugin: false };

            const createPlugin = Ahem.toFactory({
                name: 'my-plugin',
                register: (server, options) => {

                    srv = server;

                    expect(options).to.equal({ some: 'options' });

                    server.ext('onPreStart', () => {

                        initialized.plugin = true;
                    });
                }
            });

            const root = Hapi.server();

            root.ext('onPreStart', () => {

                initialized.root = true;
            });

            const plugin = await createPlugin(root, { some: 'options' }, {
                initialize: true
            });

            expect(initialized).to.equal({ root: true, plugin: true });
            expect(plugin).to.exist();
            expect(plugin).to.shallow.equal(srv);
        });
    });
});
