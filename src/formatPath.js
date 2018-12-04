const formatPath = path => {
  const [head, ...tail] = path;
  return (
    head.toString() +
    tail
      .map(x => {
        if (typeof x === 'string') {
          return `.${x}`;
        } else if (typeof x === 'number') {
          return `[${x.toString()}]`;
        }
        throw new Error(
          `Invalid path (must be an array of strings and numbers)`
        );
      })
      .join('')
  );
};

export default formatPath;
