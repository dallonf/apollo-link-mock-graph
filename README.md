# Apollo MockGraphLink

[![Build Status](https://travis-ci.org/dallonf/apollo-link-mock-graph.svg?branch=master)](https://travis-ci.org/dallonf/apollo-link-mock-graph)
[![npm version](https://img.shields.io/npm/v/apollo-link-mock-graph.svg)](https://www.npmjs.com/package/apollo-link-mock-graph)

An [Apollo Link](https://www.apollographql.com/docs/link/) that resolves incoming queries from a loosely typed mock graph in memory. Useful for integration tests where you want to abstract away a full GraphQL server and provide dummy data tailored for that test.

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
  Query: {
    // Simple fields will be resolved directly from the mock graph
    greeting: 'Hello, World!',
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
      };
    },
  },
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
  possibleTypes,
  timeoutMs: 100,
});
```

`getMockGraph: () => MockGraph`

The first argument is required; it is a function that returns a reference to the current mock graph. This lets you update this state however is most convenient for your app; there is no `setMockGraph` function.

`opts.onError?: (errors: MockGraphError[], queryDocument: GraphQLAST) => void`

This function is called when an error occurs while resolving a query from the mock graph. Usually this is because the mock graph doesn't have enough data to satisfy the query! You can use this function to report the errors to your test runner to help you debug your tests.

By default, this will print the query and errors to `console.error`. You can also pass a no-op function to suppress this behavior.

`opts.possibleTypes?: PossibleTypes`

```ts
interface PossibleTypes {
  [typeName]: string[]
}
```

If your queries contain fragments on union or interface types, you will need to provide this option so that the MockLinkGraph can distinguish between types. See https://www.apollographql.com/docs/react/data/fragments/#using-fragments-with-unions-and-interfaces for more details on why this is needed and how to extract this data from your schema.

`opts.timeoutMs?: number`

You can customize the time delay before a query resolves. Defaults to 100ms.

#### `MockGraphLink.waitForQueries(opts: { waitToSettle?: boolean }?): Promise`

Useful for testing; returns a promise that resolves when all active queries have resolved.

`opts.waitToSettle?: boolean`

Defaults to true. When true, will also check to see if any resolved queries have caused _other_ queries to start, and if so, will wait for those, too.

Example:

```js
it('should hide save button', async () => {
  const link = new MockGraphLink(() => mockGqlGraph);
  const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });
  const wrapper = renderUi(client);
  await link.waitForQueries();
  expect(wrapper.find('saveButton')).not.toExist();
});
```

### MockGraphError

```ts
// A number indicates an array index
// String field names also include any arguments, if applicable
// ex. `userById({"id":"123"})`
type MockGraphPath = (string | number)[];

type MockGraphError =
  | {
      // A field has been queried that is not present in the mock graph
      type: 'missing';
      message: string;
      path: MockGraphPath;
    }
  | {
      // An error occurred while executing a resolver function
      type: 'resolver';
      message: string;
      error: Error;
      args: object;
      path: MockGraphPath;
    }
  | {
      // A resolver function returned undefined
      type: 'fnReturnUndefined';
      message: string;
      args: object;
      path: MockGraphPath;
    }
  | {
      // A field mocked as a static value was queried with args
      // and needs to be a resolver function instead
      type: 'fnRequired';
      message: string;
      args: object;
      path: MockGraphPath;
    };
```

### MockGraph

```ts
type MockGraph = {
  Query?: MockGraphObject;
  Mutation?: MockGraphObject;
};

type MockGraphObject = {
  [fieldName: string]:
    | MockGraphField
    | ((args: object) => MockGraphField | undefined);
};

type MockGraphField =
  | null
  | string
  | number
  | boolean
  | MockGraphObject
  | MockGraphObject[];
```

## Recipes

### Using with Cypress

Here is an example of how to mock an Apollo Client instance in Cypress.

```js
// When setting up Apollo Client
let link = null;

if (__LOCAL__ && global.__MOCK_GQL_GRAPH) {
  if (global.__MOCK_GQL_GRAPH) {
    // To set up GQL graph mocking, set `__MOCK_GQL_GRAPH = {/* mock graph data goes here */}` before the app inits
    // and whenever you want to change the mock data.
    const MockGraphLink = require('apollo-link-mock-graph').default;
    link = new MockGraphLink(() => global.__MOCK_GQL_GRAPH);
  }
} else {
  // create link normally
  link = createHttpLink({ uri: '/graphql' });
}
```

```js
// cypress/support/commands/gqlGraph.js
let mockGraph = null;

beforeEach(() => {
  mockGraph = null;
  cy.on('window:before:load', win => {
    // If the graph has been set before the window loaded,
    // feed it into the window now
    if (mockGraph) {
      win.__MOCK_GQL_GRAPH = mockGraph;
    }
  });
});

Cypress.Commands.add('mockGqlGraph', newMockGraph => {
  mockGraph = newMockGraph;
  cy.window().then(win => {
    win.__MOCK_GQL_GRAPH = mockGraph;
  });
});
```

```js
// In a test
it('mocks a GQL query', function() {
  cy.mockGqlGraph({
    Query: {
      greeting: 'Hello, World!',
      currentUser: {
        __typename: 'User',
        id: '123',
        name: 'Homer',
      },
      userById: args => {
        expect(args.id).toBe(456);
        return {
          __typename: 'User',
          id: '456',
          name: 'Marge',
        };
      },
    },
  });
  cy.visit('/');
});
```
