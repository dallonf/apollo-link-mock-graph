import { ApolloLink, Observable } from 'apollo-link';
import graphqlAnywhere from 'graphql-anywhere';

class MockGraphLink extends ApolloLink {
  constructor(getMockGraph) {
    super();
    this.getMockGraph = getMockGraph;
  }

  assertNoUnusedMocks() {
    if (this.mocks.length) {
      throw new Error(
        `Unused mocks for operations ${this.mocks
          .map(m => m.operationName)
          .join(', ')}`
      );
    }
  }

  request(operation, forward) {
    const operationDefinitions = operation.query.definitions;
    const matchedOperationDefinition = operationDefinitions.find(
      o => o.name.value === operation.operationName
    );

    let rootValue;
    if (matchedOperationDefinition.operation === 'query') {
      rootValue = this.getMockGraph().Query;
      if (!rootValue) {
        throw new Error('Query must be mocked to fulfill a "query" operation');
      }
    } else {
      throw new Error(
        `Can't yet mock operation type "${
          matchedOperationDefinition.operation
        }"`
      );
    }

    const result = graphqlAnywhere(
      (fieldName, rootValue, args) => {
        const mockedValue = rootValue[fieldName];
        if (mockedValue === undefined) {
          throw new Error(
            `Value for field ${fieldName} is missing in query ${
              operation.operationName
            }`
          );
        } else if (typeof mockedValue === 'function') {
          const resolvedValue = mockedValue(args || {});
          if (resolvedValue === undefined) {
            throw new Error(
              `Resolver for field ${fieldName} in query ${
                operation.operationName
              } returned undefined for arguments ${JSON.stringify(
                args
              )}. If null is intended, return it explicitly.`
            );
          } else {
            return resolvedValue;
          }
        } else if (
          args &&
          Object.keys(args).length &&
          typeof mockedValue !== 'function'
        ) {
          throw new Error(
            `Field ${fieldName} in query ${
              operation.operationName
            } takes arguments (${JSON.stringify(
              args
            )}), so it must be mocked as a function`
          );
        } else {
          return mockedValue;
        }
      },
      operation.query,
      rootValue,
      {},
      operation.variables
    );

    return new Observable(sub => {
      const timeout = setTimeout(() => {
        sub.next({ data: result });
        sub.complete();
      }, 100);
      return () => clearTimeout(timeout);
    });
  }
}

export default MockGraphLink;
