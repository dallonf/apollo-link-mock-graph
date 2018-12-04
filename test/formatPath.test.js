import formatPath from '../src/formatPath';

it('formats a path', () => {
  expect(
    formatPath([
      'userById({"id":"123"})',
      'posts',
      'data',
      2,
      'replies',
      0,
      'title',
    ])
  ).toBe('userById({"id":"123"}).posts.data[2].replies[0].title');
});
