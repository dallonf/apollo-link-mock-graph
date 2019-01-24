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
import formatPath from './formatPath';
import defaultOnError from './defaultOnError';

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
  constructor(getMockGraph, opts = {}) {
    super();
    const { onError = defaultOnError } = opts;
    this.getMockGraph = getMockGraph;
    this.onError = onError;
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

    const errors = [];

    const executeSelectionSet = (selectionSet, rootValue, currentPath) => {
      const result = {};
      selectionSet.selections.forEach(selection => {
        if (!shouldInclude(selectionSet, operation.variables)) {
          // Skip this entirely
          return;
        }

        if (isField(selection)) {
          const fieldResult = executeField(selection, rootValue, currentPath);

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

          let fragmentType;
          if (
            fragment.typeCondition &&
            fragment.typeCondition.kind === 'NamedType' &&
            fragment.typeCondition.name.kind === 'Name'
          ) {
            fragmentType = fragment.typeCondition.name.value;
          }
          const objectType = rootValue.__typename;
          if (!objectType) {
            errors.push({
              type: 'noTypename',
              path: currentPath,
              fragmentName: fragment.name.value,
            });
          } else if (fragmentType === objectType) {
            // only execute the fragment if it is the correct type
            const fragmentResult = executeSelectionSet(
              fragment.selectionSet,
              rootValue,
              currentPath
            );

            merge(result, fragmentResult);
          } else {
            errors.push({
              type: 'unionInterfaceTypes',
              path: currentPath,
              fragmentName: fragment.name.value,
              objectType,
              fragmentType,
            });
          }
        }
      });

      return result;
    };

    const executeField = (field, rootValue, currentPath) => {
      const fieldName = field.name.value;
      const args = argumentsObjectFromField(field, operation.variables);

      const path = [
        ...currentPath,
        args ? `${fieldName}(${JSON.stringify(args)})` : fieldName,
      ];

      const mockedValue = rootValue[fieldName];
      let result;
      if (mockedValue === undefined) {
        errors.push({
          type: 'missing',
          path,
        });
        result = null;
      } else if (typeof mockedValue === 'function') {
        let resolvedValue, executionError;
        try {
          resolvedValue = mockedValue(args || {});
        } catch (err) {
          executionError = err;
        }
        if (executionError) {
          errors.push({ type: 'resolver', error: executionError, args, path });
          result = null;
        } else if (resolvedValue === undefined) {
          errors.push({
            type: 'fnReturnUndefined',
            args,
            path,
          });
          result = null;
        } else {
          result = resolvedValue;
        }
      } else if (
        args &&
        Object.keys(args).length &&
        typeof mockedValue !== 'function'
      ) {
        errors.push({
          type: 'fnRequired',
          args,
          path,
        });
        result = null;
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
        return executeSubSelectedArray(field, result, path);
      }

      // Returned value is an object, and the query has a sub-selection. Recurse.
      return executeSelectionSet(field.selectionSet, result, path);
    };

    const executeSubSelectedArray = (field, result, currentPath) => {
      return result.map((item, i) => {
        // null value in array
        if (item === null) {
          return null;
        }

        const path = [...currentPath, i];

        // This is a nested array, recurse
        if (Array.isArray(item)) {
          return executeSubSelectedArray(field, item, path);
        }

        // This is an object, run the selection set on it
        return executeSelectionSet(field.selectionSet, item, path);
      });
    };

    const result = executeSelectionSet(
      mainDefinition.selectionSet,
      rootValue,
      []
    );

    const formattedErrors = errors.length
      ? errors.map(e => {
          let message = e.type;
          if (e.type === 'missing') {
            message = `Field is missing from mock graph`;
          } else if (e.type === 'fnReturnUndefined') {
            message = `Mock resolver returned undefined; did you mean to return null?`;
          } else if (e.type === 'fnRequired') {
            message = `This field received args and thus must be mocked as a function.`;
          } else if (e.type === 'resolver') {
            message = `Error from resolver: ${e.error.message}`;
          } else if (e.type === 'noTypename') {
            message = `Can't resolve fragment ${
              e.fragmentName
            } because __typename is missing from the mock graph`;
          } else if (e.type === 'unionInterfaceTypes') {
            message = `Can't resolve fragment ${
              e.fragmentName
            } because its type (${
              e.fragmentType
            }) might not match the object's type (${
              e.objectType
            }). See https://github.com/dallonf/apollo-link-mock-graph/blob/master/README.md for how to handle union and interface types.`;
          }
          message = `${formatPath(e.path)}: ${message}`;
          return {
            ...e,
            message,
          };
        })
      : null;

    if (errors.length) {
      this.onError(formattedErrors, operation.query);
    }

    return new Observable(sub => {
      const timeout = setTimeout(() => {
        sub.next({ data: result, errors: formattedErrors });
        sub.complete();
      }, 100);
      return () => clearTimeout(timeout);
    });
  }
}

export default MockGraphLink;
