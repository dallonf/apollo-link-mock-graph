# Apollo MockGraphLink

An [Apollo Link] that resolves incoming queries from a loosely typed mock graph in memory. Useful for integration tests where you want to abstract away a full GraphQL server and provide dummy data tailored for that test.

## Usage

Install:

```
npm install --save-dev apollo-link-mock-graph
```

Set up:

```js
import MockGraphLink from 'apollo-link-mock-graph';

// Pass a function that returns a mock graph
const link = new MockGraphLink(() => window.__MOCK_GQL_GRAPH);
```

And mock:

```js
const query = gql`
{
  greeting
  currentUser {
    id
    name
  }
  userById(id: "456") {
    id
    name
  }
}
`;

window.__MOCK_GQL_GRAPH = {
  // Simple fields will be resolved directly from the mock graph
  greeting: 'Hello, World!'
  currentUser: {
    // Remember that by default, Apollo client adds a `__typename` field to every queried object
    __typename: 'User',
    id: '123',
    name: 'Homer',
  },
  // For fields that take arguments, mock them with a function. Arguments are passed as an object.
  userById: args => {
    expect(args.id).toBe(456);
    return {
      __typename: 'User',
      id: '456',
      name: 'Marge',
    }
  };
};
```

## API

### `new MockGraphLink(getMockGraph, opts?)`

```js
import MockGraphLink from 'apollo-link-mock-graph';
const link = new MockGraphLink(() => window.__MOCK_GQL_GRAPH, {
  onError: (errors, queryDocument) => {
    // report error to test runner
  },
});
```

`getMockGraph: () => MockGraph`

The first argument is required; it is a function that returns a reference to the current mock graph. This lets you update this state however is most convenient for your app; there is no `setMockGraph` function.

`opts.onError?: (errors: MockGraphError[], queryDocument: GraphQLAST) => void`

This function is called when an error occurs while resolving a query from the mock graph. Usually this is because the mock graph doesn't have enough data to satisfy the query! You can use this function to report the errors to your test runner so that can help you debug your tests.

By default, this will print the query and errors to `console.error`. You can also pass a no-op function to supress this behavior.

### MockGraphError

```ts
// A number indicates an array index
// String field names also include any arguments, if applicable
// ex. `userById({"id":"123"})`
type MockGraphPath = (string | number)[];

type MockGraphError = {
  // TODO
};
```

## Recipes

### Using with Cypress
