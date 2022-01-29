import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import gql from "graphql-tag";
import MockGraphLink from "../src/MockGraphLink";

const createClient = (getMockGraph) => {
  const onError = jest.fn();
  const link = new MockGraphLink(getMockGraph, {
    onError,
  });
  const client = new ApolloClient({ link, cache: new InMemoryCache() });
  return { client, onError };
};

it("reports a missing field in the mock", async () => {
  const mockGraph = {
    Query: {
      userById: (args) => {
        expect(args.id).toBe("123");
        return {
          __typename: "User",
          id: "123",
        };
      },
    },
  };
  const { client, onError } = createClient(() => mockGraph);

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
        throw new Error("Should not have resolved");
      },
      (err) => err
    );

  expect(err).toMatchSnapshot();
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls[0]).toMatchSnapshot();
});

it("reports a function that returns undefined", async () => {
  const mockGraph = {
    Query: {
      userById: (args) => {},
    },
  };
  const { client, onError } = createClient(() => mockGraph);

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
        throw new Error("Should not have resolved");
      },
      (err) => err
    );

  expect(err).toMatchSnapshot();
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls[0]).toMatchSnapshot();
});

it("reports a field that needs to be mocked with a function", async () => {
  const mockGraph = {
    Query: {
      userById: {
        id: "123",
        name: "Bob",
      },
    },
  };
  const { client, onError } = createClient(() => mockGraph);

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
        throw new Error("Should not have resolved");
      },
      (err) => err
    );

  expect(err).toMatchSnapshot();
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls[0]).toMatchSnapshot();
});

it("reports a fragment on an object without a typename", async () => {
  const mockGraph = {
    Query: {
      currentUser: {
        id: "123",
        name: "Bob",
      },
    },
  };
  const { client, onError } = createClient(() => mockGraph);

  const query = gql`
    query MyQuery {
      currentUser {
        id
        ...UserView
      }
    }

    fragment UserView on User {
      name
    }
  `;

  const err = await client
    .query({
      query,
    })
    .then(
      () => {
        throw new Error("Should not have resolved");
      },
      (err) => err
    );

  expect(err).toMatchSnapshot();
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls[0]).toMatchSnapshot();
});

it("fails on non-matching fragments without possibleTypes config", async () => {
  const mockGraph = {
    Query: {
      currentUser: {
        __typename: "FreeUser",
        id: "123",
        name: "Bob",
      },
    },
  };
  const { client, onError } = createClient(() => mockGraph);

  const query = gql`
    query MyQuery {
      currentUser {
        id
        name
        ... on PremiumUser {
          nextPaymentDate
        }
      }
    }
  `;

  const err = await client
    .query({
      query,
    })
    .then(
      () => {
        throw new Error("Should not have resolved");
      },
      (err) => err
    );

  expect(err).toMatchSnapshot();
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls[0]).toMatchSnapshot();
});

it("handles an exception in a resolver", async () => {
  const mockGraph = {
    Query: {
      userById: (args) => {
        return args.explode();
      },
    },
  };
  const { client, onError } = createClient(() => mockGraph);

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
        throw new Error("Should not have resolved");
      },
      (err) => err
    );

  expect(err).toMatchSnapshot();
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls[0]).toMatchSnapshot();
});

it("handles a lot of errors", async () => {
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
      userById: (args) => {
        return {
          posts: [{}, {}, {}],
        };
      },
    },
  };
  const { client, onError } = createClient(() => mockGraph);

  const err = await client
    .query({
      query,
    })
    .then(
      () => {
        throw new Error("Should not have resolved");
      },
      (err) => err
    );

  expect(err).toMatchSnapshot();
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls[0]).toMatchSnapshot();
});
