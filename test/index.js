'use strict';

// Load modules

const Path = require('path');
const Lab = require('@hapi/lab');
const Code = require('@hapi/code');
const Hapi = require('@hapi/hapi');
const Vision = require('@hapi/vision');
// const Closet = require('./closet');
const HauteCouture = require('..');

// Test shortcuts

const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;

const internals = {};

describe('HauteCouture', () => {

    describe('instance', () => {

        it('sandboxes plugin instantiation.', async () => {

            const server = Hapi.server();
            const vision = await HauteCouture.instance(server, Vision, {
                engines: { hbs: require('handlebars') },
                path: `${__dirname}/closet/templates`
            });

            const result = await vision.render('welcome', {
                context: { name: 'Jackie' }
            });

            console.log(result);
        });

        it('x.', async () => {

            const server = Hapi.server();
            const vision = await HauteCouture.instance(server, Vision, {}, {
                controlled: false
            });

            const vision = await HauteCouture.instance(Vision, {}, {
                server: {}
            });
        });

        it('x.', async () => {

            // Fails

            const vision = await HauteCouture.instance(Vision, {}, {
                controlled: true
            });

            const server = Hapi.server();
            const vision = await HauteCouture.instance(server, Vision, {}, {
                server: {}, // We will not be creating a server
                controlled: false
            });

            // When server is not a root server
            const vision = await HauteCouture.instance(server, Vision, {}, {
                decorateRoot: true
            });
        });

        it('x.', async () => {

            const server = Hapi.server();
            const vision = await HauteCouture.instance(Vision, {
                options: { random: 'thing' },
                routes: { prefix: '/a' }
            });

            const vision = await HauteCouture.instance(Vision, {
                random: 'thing'
            });
        });

        it('x.', async () => {

            const vision = await HauteCouture.instance(Vision, {
                random: 'thing'
            }, {
                server: { cors: true },
                register: [{
                    plugin: Inert,
                    options: {}
                }]
            });
        });

        it('x.', async () => {

            const Plugin = class {

                register() {

                }

                static get attributes() {

                    return {
                        name: 'plugin'
                    };
                }
            };

            const vision = await HauteCouture.instance(Vision, {
                random: 'thing'
            }, {
                server: { cors: true },
                register: [{
                    plugin: Inert,
                    options: {}
                }]
            });
        });
    });
});

// module.exports = async (server) => {

//     // const { initialize } = Schmervice.createService(server)

//     // let vision;

//     // initialize(async () => {

//     //     vision = await HauteCouture.instance(server, Vision, {
//     //         engines: { hbs: require('handlebars') },
//     //         path: `${__dirname}/closet/templates`
//     //     });

//     //     await vision.initialize();
//     // });

//     const vision = await HauteCouture.instance(server, Vision, {
//         engines: { hbs: require('handlebars') },
//         path: `${__dirname}/closet/templates`
//     });

//     return {
//         name: vision.realm.plugin,
//         static get service() {

//             return vision;
//         }
//     };
// };
