'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');


const { before, describe, it } = exports.lab = Lab.script();
const expect = Code.expect;


describe('import()', () => {

    let Ahem;

    before(async () => {

        Ahem = await import('../lib/index.js');
    });

    it('exposes all methods and classes as named imports', () => {

        expect(Object.keys(Ahem)).to.equal([
            'default',
            'instance',
            'plugin',
            'toFactory'
        ]);
    });
});
