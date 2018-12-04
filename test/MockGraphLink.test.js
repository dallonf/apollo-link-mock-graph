import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import MockGraphLink from '../src/MockGraphLink';

it('mocks a query', async () => {
  const mockData = {
    Query: {
      greeting: 'Hello, World!',
    },
  };
  const link = new MockGraphLink(() => mockData);
  const client = new ApolloClient({ link, cache: new InMemoryCache() });

  const query = gql`
    query MyQuery($name: String) {
      greeting
    }
  `;

  const result = await client.query({
    query,
    variables: { name: 'World' },
  });

  expect(result.data).toEqual({
    greeting: 'Hello, World!',
  });
});

it('mocks a query with arguments', async () => {
  const mockData = {
    Query: {
      greeting: args => `Hello, ${args.name}!`,
    },
  };
  const link = new MockGraphLink(() => mockData);
  const client = new ApolloClient({ link, cache: new InMemoryCache() });

  const query = gql`
    query MyQuery($name: String) {
      greeting(name: $name)
    }
  `;
  const result = await client.query({
    query,
    variables: { name: 'Bob' },
  });

  expect(result.data).toEqual({
    greeting: 'Hello, Bob!',
  });
});
