import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import MockGraphLink from '../src/MockGraphLink';

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

it('handles a lot of errors', async () => {
  const query = gql`
    query QueryWithErrors {
      userById(id: "123") {
        id
        firstName
        lastName
        posts {
          id
          message
          date
          likes
        }
      }
    }
  `;

  const mockGraph = {
    Query: {
      userById: args => {
        return {
          posts: [{}, {}, {}],
        };
      },
    },
  };
  const link = new MockGraphLink(() => mockGraph);
  const client = new ApolloClient({ link, cache: new InMemoryCache() });

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
