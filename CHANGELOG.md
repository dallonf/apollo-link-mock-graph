# 2.0.1

* Upgrade to Apollo Client 3.6.9
* Upgrade to graphql 16.5.0

# 2.0.0

* Breaking: Upgrade to Apollo Client 3.x
  * `fragmentIntrospectionQueryResultData` has been replaced with `possibleTypes`; see https://www.apollographql.com/docs/react/migrating/apollo-client-3-migration/#cache-improvements and https://www.apollographql.com/docs/react/data/fragments/#defining-possibletypes-manually for more information on the changes to Apollo Client
* Breaking: Upgrade to graphql-js 16.x

# 1.2.0

* Feature: new `timeoutMs` option to customize the delay
* Feature: new `link.waitForQueries()` function

# 1.1.0

* Feature: Support fragments on interfaces and unions via a new `fragmentIntrospectionQueryResultData` option.

# 1.0.0

Initial version.