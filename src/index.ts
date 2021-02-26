import makeFetch, {
  NormalizedRequest,
  HandlerResponse,
  Fetch,
  RawHeaders
} from 'make-fetch'

import mime from 'mime/lite'

import {
  AuthorKeypair,
  IStorage,
  StorageMemory,
  ValidatorEs4,
} from 'earthstar'

export interface EarthstarOptions {
  // TODO: Persistence location / options
  loadStorage?: (name: string) => Promise<IStorage>
}

async function defaultLoadStorage (name: string): Promise<IStorage> {
  return new StorageMemory([ValidatorEs4], name)
}

export default function makeEarthstar ({
  loadStorage = defaultLoadStorage
}: EarthstarOptions = {}): Fetch {
  const workspaces = new Map<string, IStorage>()
  const ownIdentities = new Map<string, AuthorKeypair>()

  async function getWorkspace (name: string): Promise<IStorage> {
    if (workspaces.has(name)) {
      return workspaces.get(name) as IStorage
    }
    const workspace = await loadStorage(name)
    workspaces.set(name, workspace)
    return workspace
  }

  return makeFetch(handler)

  async function handler (request: NormalizedRequest): Promise<HandlerResponse> {
    const { url, headers, method, body } = request
    const responseHeaders: RawHeaders = {}
    responseHeaders['Access-Control-Allow-Origin'] = '*'
    responseHeaders['Allow-CSP-From'] = '*'
    responseHeaders['Access-Control-Allow-Headers'] = [
      'Link',
      'Allow',
      'ETag',
      'Content-Type',
      'Accept-Ranges',
      'X-Blocks',
      'X-Blocks-Downloaded',
      'Content-Length',
      'Content-Range'
    ].join(', ')

    const parsed = new URL(url)

    const { protocol, search, searchParams } = parsed

    if (protocol !== 'earthstar:') throw new TypeError('Invalid protocol: ' + protocol)

    let { host, pathname } = parsed

    // Account for earthstar not being supported in browsers
    if (host === undefined) {
      const parts = pathname.split('/')
      host = parts[0]
      pathname = parts.slice(1).join('/')
    }

    if (host.startsWith('@')) {
      // TODO: Account creation and info stuff
      return {
        statusCode: 404
      }
    } else if (host.startsWith('+')) {
      if (method === 'GET') {
        const workspace = await getWorkspace(host)
        try {
          if (pathname.endsWith('/')) {
            // Fancy directory stuff here?
            return {
              statusCode: 404
            }
          } else {
            // Just get the value out
            const _document = await workspace.getDocument(pathname)
            if (_document === undefined) throw new Error('Not Found')
            const document = _document
            const { contentHash, content, author, timestamp, signature } = document
            responseHeaders.Etag = `"${contentHash}"`
            responseHeaders['Last-Modified'] = new Date(timestamp).toString()
            responseHeaders['x-earthstar-author'] = author
            responseHeaders['x-earthstar-signature'] = signature
            responseHeaders['Content-Type'] = getMimeType(pathname)
            return {
              statusCode: 200,
              headers: responseHeaders,
              data: toIterable(content)
            }
          }
        } catch (error) {
          return {
            statusCode: 404,
            headers: responseHeaders,
            data: toIterable(error.message)
          }
        }
      } else if (method === 'PUT') {
        const workspace = await getWorkspace(host)

        return {}
      } else {
        return {
          statusCode: 405,
          headers: responseHeaders,
          data: toIterable('Method Not Allowed')
        }
      }
    } else {
      return {
        statusCode: 400,
        headers: responseHeaders,
        data: toIterable('Invalid origin')
      }
    }
  }
}

async function * toIterable (data: string | string[]): AsyncIterableIterator<string> {
  if (Array.isArray(data)) {
    yield * data
  } else {
    yield data
  }
}

async function toString (body: AsyncIterableIterator<Uint8Array>): Promise<string> {
  const all: Uint8Array[] = []
  for await (const buffer of body) {
    all.push(buffer)
  }

  return Buffer.concat(all).toString('utf8')
}

function getMimeType (path: string): string {
  let mimeType = mime.getType(path) ?? 'text/plain'
  if (mimeType.startsWith('text/')) mimeType = `${mimeType}; charset=utf-8`
  return mimeType
}
