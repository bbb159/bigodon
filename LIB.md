## Usage

```javascript
const { compile } = require('bigodon');

async function main() {
    const source = 'Hello, {{name}}!';
    const template = compile(source);

    const result = await template({
        name: 'George'
    });

    console.log(result); // Hello, George!
}

main().catch(console.error);
```

Or, if you want to split parsing from execution between services or cache the parsed AST:
```javascript
const { parse, run } = require('bigodon');

const source = 'Hello, {{name}}!';
const ast = parse(source); // This will return a JSON object that can be persisted for later usage


// In another process or later:
async function main() {
    const result = await run(ast, {
        name: 'George'
    });

    console.log(result); // Hello, George!
}
main().catch(console.error);
```

## Helpers

To add extra helpers, you need to instantiate your own `bigodon` object.

### JavaScript

```javascript
const Bigodon = require('bigodon').default;
const bigodon = new Bigodon();

bigodon.addHelper('add', (a, b) => a + b);

async function main() {
    const source = '1 + 1 is {{add 1 1}}!';
    const template = bigodon.compile(source); // Using our bigodon instance instead of the default compile
    console.log(await template()); // 1 + 1 is 2!
}

main().catch(console.error);
```

### TypeScript

```typescript
import Bigodon from 'bigodon';
const bigodon = new Bigodon();

bigodon.addHelper('add', (a: number, b: number): number => a + b);

async function main() {
    const source = '1 + 1 is {{add 1 1}}!';
    const template = bigodon.compile(source); // Using our bigodon instance instead of the default compile
    console.log(await template()); // 1 + 1 is 2!
}

main().catch(console.error);
```

## Block helpers

To add block helpers, simply create a helper that returns:
- A falsy value or an empty array to indicate that the block should be skipped or that the else block should be rendered
- An object to indicate that the block should run with that context
- An array to indicate that the block should run for each item of the array as context
- A truthy value to indicate that the block should be rendered with parent context

```javascript
const Bigodon = require('bigodon').default;
const bigodon = new Bigodon();

bigodon.addHelper('isEven', (value) => value % 2 === 0);

async function main() {
    const source = '{{num}} is {{#isEven num}}even{{else}}odd{{/isEven}}';
    const template = bigodon.compile(source);
    console.log(await template({ num: 2 })); // 2 is even
    console.log(await template({ num: 3 })); // 3 is odd
}

main().catch(console.error);
```

## Data from execution

Your helpers can provide data from the templates to your code by using the `this.data` object.

```typescript
import Bigodon from 'bigodon';
const bigodon = new Bigodon();

bigodon.addHelper('setTitle', function (title: string): void {
    if(!this.data) {
        return;
    }

    this.data.title = title;
});

async function main() {
    const source = '{{setTitle (uppercase text)}}';
    const template = bigodon.compile(source);

    const data = {};
    await template({
        text: "Lorem ipsum",
    }, { data });

    console.log(data.title); // LOREM IPSUM
}

main().catch(console.error);
```
