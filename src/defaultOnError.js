import { print } from 'graphql';

const onError = (errors, document) => {
  console.error(
    'MockGraphLink: Failed to resolve a query from the mock graph; you may need to update the graph to contain all of the data being queried:\n\n',
    print(document),
    '\n\nErrors:\n',
    errors
  );
};
export default onError;
