import { ApolloLink, Observable } from 'apollo-link';
import {
  getMainDefinition,
  getFragmentDefinitions,
  createFragmentMap,
  shouldInclude,
  isField,
  resultKeyNameFromField,
  isInlineFragment,
  argumentsObjectFromField,
} from 'apollo-utilities';

/// copied from graphql-anywhere
export function merge(dest, src) {
  if (src !== null && typeof src === 'object') {
    Object.keys(src).forEach(key => {
      const srcVal = src[key];
      if (!Object.prototype.hasOwnProperty.call(dest, key)) {
        dest[key] = srcVal;
      } else {
        merge(dest[key], srcVal);
      }
    });
  }
}

class MockGraphLink extends ApolloLink {
  constructor(getMockGraph) {
    super();
    this.getMockGraph = getMockGraph;
  }

  request(operation, forward) {
    const operationDefinitions = operation.query.definitions;
    const matchedOperationDefinition = operationDefinitions.find(o =>
      operation.operationName === null
        ? o.name == null
        : o.name.value === operation.operationName
    );

    let rootValue;
    if (matchedOperationDefinition.operation === 'query') {
      rootValue = this.getMockGraph().Query;
      if (!rootValue) {
        throw new Error('Query must be mocked to fulfill a "query" operation');
      }
    } else if (matchedOperationDefinition.operation === 'mutation') {
      rootValue = this.getMockGraph().Mutation;
      if (!rootValue) {
        throw new Error(
          'Mutation must be mocked to fulfill a "mutation" operation'
        );
      }
    } else {
      throw new Error(
        `Can't yet mock operation type "${
          matchedOperationDefinition.operation
        }"`
      );
    }

    // Based on the source of graphql-anywhere
    const mainDefinition = getMainDefinition(operation.query);
    const fragments = getFragmentDefinitions(operation.query);
    const fragmentMap = createFragmentMap(fragments);

    const executeSelectionSet = (selectionSet, rootValue) => {
      const result = {};
      selectionSet.selections.forEach(selection => {
        if (!shouldInclude(selectionSet, operation.variables)) {
          // Skip this entirely
          return;
        }

        if (isField(selection)) {
          const fieldResult = executeField(selection, rootValue);

          const resultFieldKey = resultKeyNameFromField(selection);

          if (fieldResult !== undefined) {
            if (result[resultFieldKey] === undefined) {
              result[resultFieldKey] = fieldResult;
            } else {
              merge(result[resultFieldKey], fieldResult);
            }
          }
        } else {
          let fragment;

          if (isInlineFragment(selection)) {
            fragment = selection;
          } else {
            // This is a named fragment
            fragment = fragmentMap[selection.name.value];

            if (!fragment) {
              throw new Error(`No fragment named ${selection.name.value}`);
            }
          }

          const fragmentResult = executeSelectionSet(
            fragment.selectionSet,
            rootValue
          );

          merge(result, fragmentResult);
        }
      });

      return result;
    };

    const executeField = (field, rootValue) => {
      const fieldName = field.name.value;
      const args = argumentsObjectFromField(field, operation.variables);

      const mockedValue = rootValue[fieldName];
      let result;
      if (mockedValue === undefined) {
        throw new Error(
          `Value for field ${fieldName} is missing in query ${
            operation.operationName
          }`
        );
      }
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
          result = resolvedValue;
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
        result = mockedValue;
      }

      // Handle all scalar types here
      if (!field.selectionSet) {
        return result;
      }

      // From here down, the field has a selection set, which means it's trying to
      // query a GraphQLObjectType
      if (result === null) {
        // Basically any field in a GraphQL response can be null, or missing
        return result;
      }

      if (Array.isArray(result)) {
        return executeSubSelectedArray(field, result);
      }

      // Returned value is an object, and the query has a sub-selection. Recurse.
      return executeSelectionSet(field.selectionSet, result);
    };

    const executeSubSelectedArray = (field, result) => {
      return result.map(item => {
        // null value in array
        if (item === null) {
          return null;
        }

        // This is a nested array, recurse
        if (Array.isArray(item)) {
          return executeSubSelectedArray(field, item);
        }

        // This is an object, run the selection set on it
        return executeSelectionSet(field.selectionSet, item);
      });
    };

    const result = executeSelectionSet(mainDefinition.selectionSet, rootValue);

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
