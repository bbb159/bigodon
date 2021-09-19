const Lab = require('@hapi/lab');
const Code = require('@hapi/code');

const { compile, run, default: Bigodon } = require('../dist');
const { VERSION } = require('../dist/parser/index');

const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;

describe('runner', () => {
    it('should not run unsupported versions', async () => {
        await expect(run({
            type: 'TEMPLATE',
            version: -1,
            statements: [],
        })).to.reject();

        await expect(run({
            type: 'TEMPLATE',
            version: 1e9,
            statements: [],
        })).to.reject();
    });

    it('should return text statements', async () => {
        const templ = compile('Lorem ipsum');
        expect(await templ()).to.equal('Lorem ipsum');
    });

    it('should ignore comments', async () => {
        const templ = compile('Lorem {{! ipsum }} dolor');
        expect(await templ()).to.equal('Lorem  dolor');
    });

    describe('mustache', () => {
        it('should return literal path expressions', async () => {
            const templ = compile('Hello, {{ "George" }}!');
            expect(await templ()).to.equal('Hello, George!');
        });

        it('should return simple path expressions', async () => {
            const templ = compile('Hello, {{ name }}!');
            expect(await templ({ name: 'George' })).to.equal('Hello, George!');
            expect(await templ()).to.equal('Hello, !');
            expect(await templ({})).to.equal('Hello, !');
            expect(await templ({ name: null })).to.equal('Hello, !');
            expect(await templ({ name: 5 })).to.equal('Hello, 5!');
            expect(await templ({ name: false })).to.equal('Hello, false!');
        });

        it('should return deep path expressions', async () => {
            const templ = compile('Hello, {{ name.first }} {{ name.last }}!');
            expect(await templ({ name: { first: 'George', last: 'Schmidt' } })).to.equal('Hello, George Schmidt!');
            expect(await templ()).to.equal('Hello,  !');
            expect(await templ({})).to.equal('Hello,  !');
            expect(await templ({ name: null })).to.equal('Hello,  !');
            expect(await templ({ name: 5 })).to.equal('Hello,  !');
            expect(await templ({ name: false })).to.equal('Hello,  !');
        });

        it('should ignore unsafe keys', async () => {
            const templ = compile('Hello, {{ name.constructor }} {{ name.__proto__ }}!');
            expect(await templ({ name: {
                __proto__: 'foo',
                constructor: 'bar',
            } })).to.equal('Hello,  !');
        });

        it('should ignore unknown statements', async () => {
            const result = await run({
                type: 'TEMPLATE',
                version: VERSION,
                statements: [{
                    type: 'TEXT',
                    value: 'foo',
                }, {
                    type: 'ABLUEBLUE',
                    value: 'noope',
                }, {
                    type: 'TEXT',
                    value: 'bar',
                }]
            });

            expect(result).to.equal('foobar');
        });
    });

    describe('blocks', () => {
        it('should return statements with truthy value', async () => {
            const templ = compile('{{#val}}foo{{/val}}');
            expect(await templ({ val: true })).to.equal('foo');
            expect(await templ({ val: 'a' })).to.equal('foo');
            expect(await templ({ val: {} })).to.equal('foo');
            expect(await templ({ val: 1 })).to.equal('foo');
        });

        it('should ignore statements with falsy value', async () => {
            const templ = compile('{{#val}}foo{{/val}}');
            expect(await templ({ val: false })).to.equal('');
            expect(await templ({ val: null })).to.equal('');
            expect(await templ({ val: '' })).to.equal('');
            expect(await templ({ val: [] })).to.equal('');
            expect(await templ({ val: 0 })).to.equal('');
            expect(await templ()).to.equal('');
        });

        it('should run else block with falsy value', async () => {
            const templ = compile('{{#val}}foo{{else}}bar{{/val}}');
            expect(await templ({ val: false })).to.equal('bar');
        });

        it('should not run else block with truthy value', async () => {
            const templ = compile('{{#val}}foo{{else}}bar{{/val}}');
            expect(await templ({ val: true })).to.equal('foo');
        });

        it('should run else block with empty arrays', async () => {
            const templ = compile('{{#val}}foo{{else}}bar{{/val}}');
            expect(await templ({ val: [] })).to.equal('bar');
        });

        it('should not run else block with non-empty arrays', async () => {
            const templ = compile('{{#val}}foo{{else}}bar{{/val}}');
            expect(await templ({ val: [1] })).to.equal('foo');
        });

        it('should run statements N times with array', async () => {
            const templ = compile('{{#val}}foo{{/val}}');
            expect(await templ({ val: [1, 2, 3] })).to.equal('foofoofoo');
        });

        it('should pass parent context when non-object value', async () => {
            const templ = compile('{{#val}}{{foo}}{{/val}}');
            expect(await templ({ val: true, foo: 'bar' })).to.equal('bar');
            expect(await templ({ val: 'a', foo: 'bar' })).to.equal('bar');
            expect(await templ({ val: 1, foo: 'bar' })).to.equal('bar');
        });

        it('should pass object as context', async () => {
            const templ = compile('{{#val}}{{foo}}{{/val}}');
            expect(await templ({ val: { foo: 'bar' }, foo: 'wrong' })).to.equal('bar');
        });

        it('should pass array object items as context', async () => {
            const templ = compile('{{#val}}{{foo}}{{/val}}');
            expect(await templ({ val: [{ foo: 'bar' }, { foo: 'baz' }], foo: 'wrong' })).to.equal('barbaz');
        });

        it('should pass parent context for non-object array items', async () => {
            const templ = compile('{{#val}}{{foo}}{{/val}}');
            expect(await templ({ val: [true, 'a', 1, null, []], foo: 'bar' })).to.equal('barbarbarbarbar');
        });

        // TODO should let access parent context with ../
        // TODO should let access current object with .

        it('should run else block with parent context', async () => {
            const templ = compile('{{#val}}nah{{else}}{{foo}}{{/val}}');
            expect(await templ({ val: false, foo: 'bar' })).to.equal('bar');
        });

        it('should run negated blocks', async () => {
            const templ = compile('{{^val}}foo{{/val}}');
            expect(await templ({ val: false })).to.equal('foo');
            expect(await templ({ val: '' })).to.equal('foo');
            expect(await templ({ val: true })).to.equal('');
            expect(await templ({ val: 'a' })).to.equal('');
        });

        it('should run else of negated blocks', async () => {
            const templ = compile('{{^val}}foo{{else}}bar{{/val}}');
            expect(await templ({ val: true })).to.equal('bar');
        });

        it('should run else of negated blocks with parent context', async () => {
            const templ = compile('{{^val}}foo{{else}}{{foo}}{{/val}}');
            expect(await templ({ val: { foo: 'wrong' }, foo: 'bar' })).to.equal('bar');
        });

        it('should run negated blocks with parent context always', async () => {
            const templ = compile('{{^val}}{{foo}}{{/val}}');
            expect(await templ({ val: false, foo: 'bar' })).to.equal('bar');
        });

        it('should accept helper returns as value', async () => {
            const bigodon = new Bigodon();

            bigodon.addHelper('foo', val => new Promise(r => setTimeout(r({ val }), 50)));

            const templ = bigodon.compile('{{#foo "bar"}}{{val}}{{/foo}}');
            expect(await templ()).to.equal('bar');
        });

        it('should nest correctly', async () => {
            const templ = compile('{{#a}}{{#b}}{{c}}{{/b}}{{/a}}');
            expect(await templ({ a: { b: { c: 'foo' } } })).to.equal('foo');
        });

        it('should parse complex templates with mustaches, blocks, and so on', async () => {
            const templ = compile(`
{
    "id": {{id}},
    "code": "{{upper code}}",
    {{#name}}
    "name": "{{name}}",
    {{/name}}
    "items": [
        {{#items}}
          "{{name}}"{{^isLast}},{{/isLast}}
        {{/items}}
    ]
}
            `);
            const a = await templ({
                id: 1,
                code: 'foo',
                name: 'bar',
                items: [{ name: 'baz' }, { name: 'qux', isLast: true }],
            });
            expect(JSON.parse(a)).to.equal({
                id: 1,
                code: 'FOO',
                name: 'bar',
                items: ['baz', 'qux'],
            });

            const b = await templ({
                id: 1,
                code: 'foo',
                items: [],
            });
            expect(JSON.parse(b)).to.equal({
                id: 1,
                code: 'FOO',
                items: [],
            });
        });
    });
});
