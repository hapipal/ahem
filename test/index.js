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

        it('registers additional plugins using the composer.register option for a single plugin.', async () => {

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

        it('registers additional plugins using the composer.register option for a single plugin.', async () => {

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
    });

    describe('plugin', () => {

        it('x.', () => {});
    });
});
