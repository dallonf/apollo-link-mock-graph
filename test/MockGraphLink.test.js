import { ApolloClient } from 'apollo-client';
import {
  InMemoryCache,
  IntrospectionFragmentMatcher,
} from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import MockGraphLink from '../src/MockGraphLink';

const createClient = (getMockGraph, { introspectionQueryResultData } = {}) => {
  const onError = jest.fn();
  const link = new MockGraphLink(getMockGraph, {
    onError,
    fragmentIntrospectionQueryResultData: introspectionQueryResultData,
  });
  const fragmentMatcher = introspectionQueryResultData
    ? new IntrospectionFragmentMatcher({
        introspectionQueryResultData,
      })
    : undefined;
  const cacheOptions = {};
  if (fragmentMatcher) {
    cacheOptions.fragmentMatcher = fragmentMatcher;
  }
  const client = new ApolloClient({
    link,
    cache: new InMemoryCache(cacheOptions),
  });
  return { client, onError };
};

it('mocks a query', async () => {
  const mockGraph = {
    Query: {
      greeting: 'Hello, World!',
    },
  };
  const { client, onError } = createClient(() => mockGraph);

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
  expect(onError).not.toHaveBeenCalled();
});

it('mocks a query with arguments', async () => {
  const mockGraph = {
    Query: {
      greeting: args => `Hello, ${args.name}!`,
    },
  };
  const { client, onError } = createClient(() => mockGraph);

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
  expect(onError).not.toHaveBeenCalled();
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
  const { client, onError } = createClient(() => mockGraph);

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
  expect(onError).not.toHaveBeenCalled();
});

it('handles null results', async () => {
  const mockGraph = {
    Query: {
      userById: args => null,
      greeting: null,
    },
  };
  const { client, onError } = createClient(() => mockGraph);

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
  expect(onError).not.toHaveBeenCalled();
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
  const { client, onError } = createClient(() => mockGraph);
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
  expect(onError).not.toHaveBeenCalled();
});

it('handles inline fragments on type unions', async () => {
  const query = gql`
    {
      posts {
        id
        ...PostView
      }
    }

    fragment PostView on Post {
      title
      ... on PhotoPost {
        photoUrl
      }
      ... on VideoPost {
        youtubeId
      }
      ... on TextPost {
        body
      }
    }
  `;
  const expectedResult = {
    posts: [
      {
        __typename: 'TextPost',
        id: '1',
        title: 'Need some help',
        body:
          'How much wood could a woodchuck chuck if woodchuck could chuck wood? Asking for a friend.',
      },
      {
        __typename: 'PhotoPost',
        id: '2',
        title: 'Look at this cat!',
        photoUrl: 'https://http.cat/503',
      },
      {
        __typename: 'VideoPost',
        id: '3',
        title: 'Check out this new single from my band',
        youtubeId: 'dQw4w9WgXcQ',
      },
    ],
  };
  const mockGraph = {
    Query: {
      posts: [
        {
          __typename: 'TextPost',
          id: '1',
          title: 'Need some help',
          body:
            'How much wood could a woodchuck chuck if woodchuck could chuck wood? Asking for a friend.',
        },
        {
          __typename: 'PhotoPost',
          id: '2',
          title: 'Look at this cat!',
          photoUrl: 'https://http.cat/503',
        },
        {
          __typename: 'VideoPost',
          id: '3',
          title: 'Check out this new single from my band',
          youtubeId: 'dQw4w9WgXcQ',
        },
      ],
    },
  };
  const { client, onError } = createClient(() => mockGraph, {
    introspectionQueryResultData: {
      __schema: {
        types: [
          {
            kind: 'INTERFACE',
            name: 'Post',
            possibleTypes: [
              { name: 'TextPost' },
              { name: 'PhotoPost' },
              { name: 'VideoPost' },
            ],
          },
        ],
      },
    },
  });
  const result = await client.query({
    query,
  });
  expect(result.data).toEqual(expectedResult);
  expect(onError).not.toHaveBeenCalled();
});
