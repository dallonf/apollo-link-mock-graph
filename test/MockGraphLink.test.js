import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import MockGraphLink from '../src/MockGraphLink';

it('mocks a query', async () => {
  const mockGraph = {
    Query: {
      greeting: 'Hello, World!',
    },
  };
  const link = new MockGraphLink(() => mockGraph);
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
  const mockGraph = {
    Query: {
      greeting: args => `Hello, ${args.name}!`,
    },
  };
  const link = new MockGraphLink(() => mockGraph);
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

it('mocks a mutation', async () => {
  const mockGraph = {
    Mutation: {
      updateUser: args => {
        return {
          __typename: 'User',
          id: args.id,
          name: args.name || 'Joe',
          email: 'test@test.com',
        };
      },
    },
  };
  const link = new MockGraphLink(() => mockGraph);
  const client = new ApolloClient({ link, cache: new InMemoryCache() });

  const mutation = gql`
    mutation MyMutation($id: ID!, $name: String) {
      updateUser(id: $id, name: $name) {
        id
        name
        email
      }
    }
  `;
  const result = await client.mutate({
    mutation,
    variables: { id: '123', name: 'Joe' },
  });

  expect(result.data).toEqual({
    updateUser: {
      __typename: 'User',
      id: '123',
      name: 'Joe',
      email: 'test@test.com',
    },
  });
});

it('handles null results', async () => {
  const mockGraph = {
    Query: {
      userById: args => null,
      greeting: null,
    },
  };
  const link = new MockGraphLink(() => mockGraph);
  const client = new ApolloClient({ link, cache: new InMemoryCache() });

  const query = gql`
    query MyQuery {
      userById(id: "123") {
        id
        name
      }
      greeting
    }
  `;

  const result = await client.query({
    query,
  });
  expect(result.data).toEqual({
    userById: null,
    greeting: null,
  });
});

it('handles arrays', async () => {
  const query = gql`
    query MyQuery {
      userById(id: "123") {
        id
        name
        posts {
          id
          message
          likes
        }
      }
    }
  `;
  const mockGraph = {
    Query: {
      userById: args => {
        expect(args.id).toBe('123');
        return {
          __typename: 'User',
          id: '123',
          name: 'Bob',
          posts: [
            { __typename: 'Post', id: '1', message: 'Hello world!', likes: 10 },
            { __typename: 'Post', id: '2', message: 'cat.gif', likes: 15 },
            {
              __typename: 'Post',
              id: '3',
              message: 'Hot take: Die Hard is the best Christmas movie',
              likes: 3,
            },
          ],
        };
      },
    },
  };
  const link = new MockGraphLink(() => mockGraph);
  const client = new ApolloClient({ link, cache: new InMemoryCache() });
  const result = await client.query({
    query,
  });
  expect(result.data).toEqual({
    userById: {
      __typename: 'User',
      id: '123',
      name: 'Bob',
      posts: [
        { __typename: 'Post', id: '1', message: 'Hello world!', likes: 10 },
        { __typename: 'Post', id: '2', message: 'cat.gif', likes: 15 },
        {
          __typename: 'Post',
          id: '3',
          message: 'Hot take: Die Hard is the best Christmas movie',
          likes: 3,
        },
      ],
    },
  });
});
