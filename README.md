# earthstar-fetch

A `fetch()` interface for talking to EarthStar

## Goals

- Stick to existing conventions in HTTP-land (body, methods, prefer standard headers)
- GET data from earthstar workspaces
- GET an author address for a given name
- PUT data into a workspace
- Auto-generate identity keys from a 4 character name
- Search via querystring params and path prefixes

## Dream API

Basic URL format:

```
earthstar://+gardening.xxxxxxxxx/path/to/key.json
```

GET document

```JavaScript
const res = await fetch('earthstar://+gardening.xxxxx/example')

// Get the timestamp for when it was last updated
res.headers.get('mtime') === "1231231231231"
// Get the author for this document
res.headers.get('earthstar-author') === '@bbbb.xxxxxxxx'
// Get the signature for this document, in case you want it 🤷
res.headers.get('earthstar-signature') === 'xxxxxxx'

// Get the content of the document back out.
// If it's JSON, you should use `.json()`
const content = await res.text()
```

GET an identity 'name' - Generate an identity

```JavaScript
// Specify `@XXXX` where `X` is a lowercase ascii character
// This will generate and store a keypair for this identity
const res = fetch('earthstar://@xmpl')

// Get the generated address for your identity
const {address} = await res.json()

address === '@xmpl.xxxxxxx'
```

POST some data, sign with identity

```JavaScript
// It's good practice to use a file extension so that the proper mime type gets set
const res = await fetch('earthstar://+gardening.xxxxx/example.json', {
  method: 'post',
  body: JSON.stringify({
    hello: 'world'
  }),
  headers: {
    // Use the identity address you got before to sign your update
    "earthstar-author": "@xmpl.xxxxxx"
  }
})

// Get the timestamp for when it was last updated
res.headers.get('mtime') === "1231231231231"
// Your author address
res.headers.get('earthstar-author') === '@xmpl.xxxxxxxx'
// Get the signature for this document, in case you want it 🤷
res.headers.get('earthstar-signature') === 'xxxxxxx'
```

POST some data scoped to your identity (others cant update)

```JavaScript
// Note the `/~@xml,
const res = await fetch('earthstar://+gardening.xxxxx/example/~@xmpl.xxxxx/profile.json', {
  method: 'post',
  body: JSON.stringify({
    name: 'Example'
  }),
  headers: {
    // Use the identity address you got before to sign your update
    "earthstar-author": "@xmpl.xxxxxx"
  }
})
```

Search - A get request on a prefix with querystring parameters

Search options can be placed in the queryString section of the URL, more info can be found in the [QueryOpts interface](https://github.com/earthstar-project/earthstar/blob/master/src/util/types.ts#L194).

```JavaScript
// If you use a `/` at the end of your path, it'll do a search for things inside that path
// This is equivalent to the `path` parameter in QueryOpts
const res = await fetch('earthstar://+gardening.xxxxx/example/')

/ If you use a `*` at the end of your path, it'll do a search for paths tht start with that prefix
// This is equivalent to the `pathPrefix` parameter in QueryOpts
const res = await fetch('earthstar://+gardening.xxxxx/example*')

const paths = await res.json()

paths === [
  'example.txt',
  'foo/bar/baz.html'
]

// Get the full documents as JSON by specifying the `documents` querystring
const res = await fetch('earthstar://+gardening.xxxxx/example/?documents')

const [{format, content, path, timestamp, signature, ...etc}) = await res.json()

// Concatentate the contents of all the results of your query
const res = await fetch('earthstar://+gardeming.xxxxx/example.html/*?contents')

const concatenatedText = await res.text()
```

index.html rendering - A get request to a path with a `index.html` in it

```JavaScript
// This will check for `example.html` and `example/index.html` before trying a search
const res = await fetch('earthstar://+gardeming.xxxxx/example/')

const index = await res.txt()
```

