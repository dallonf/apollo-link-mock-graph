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

it('reports a missing field in the mock', async () => {
  const mockGraph = {
    Query: {
      userById: args => {
        expect(args.id).toBe('123');
        return {
          __typename: 'User',
          id: '123',
        };
      },
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
    }
  `;

  const err = await client
    .query({
      query,
    })
    .then(
      () => {
        throw new Error('Should not have resolved');
      },
      err => err
    );

  expect(err).toMatchSnapshot();
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

it('reports a function that returns undefined', async () => {
  const mockGraph = {
    Query: {
      userById: args => {},
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
    }
  `;

  const err = await client
    .query({
      query,
    })
    .then(
      () => {
        throw new Error('Should not have resolved');
      },
      err => err
    );

  expect(err).toMatchSnapshot();
});

it('reports a field that needs to be mocked with a function', async () => {
  const mockGraph = {
    Query: {
      userById: {
        id: '123',
        name: 'Bob',
      },
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
    }
  `;

  const err = await client
    .query({
      query,
    })
    .then(
      () => {
        throw new Error('Should not have resolved');
      },
      err => err
    );

  expect(err).toMatchSnapshot();
});

it('handles an exception in a resolver', async () => {
  const mockGraph = {
    Query: {
      userById: args => {
        return args.explode();
      },
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
    }
  `;

  const err = await client
    .query({
      query,
    })
    .then(
      () => {
        throw new Error('Should not have resolved');
      },
      err => err
    );

  expect(err).toMatchSnapshot();
});
