import makeFetch from 'make-fetch'

import {
  AuthorKeypair,
  IStorage
} from 'earthstar'

export interface EarthstarOptions {
  // TODO: Persistence location / options
  loadStorage(name: string) : Promise<IStorage>
}

async function defaultLoadStorage(name: string) : Promise<IStorage> {
  throw new Error('TODO')
}

export default function makeEarthstar({
  loadStorage = defaultLoadStorage
}: EarthstarOptions = {}) {
  const workspaces = new Map<string, IStorage>()
  const ownIdentities = new Map<string, AuthorKeypair>()

  async function getWorkspace(name: string) : Promise<IStorage> {
		if(workspaces.has(name)) return workspaces.get(name)
  }

  return makeFetch(async (request) => {
		const {url, headers, method, body } = request

		const parsed = new URL(url)

		const {protocol, search, searchParams} = parsed

		let {host, pathname} = parsed

    // Account for earthstar not being supported in browsers
		if(!host) {
			const parts = pathname.split('/')
			host = parts[0]
			pathname = parts.slice(1).join('/')
		}

		if(host.startsWith('@')) {
			// TODO
		} else if (host.startsWith('+')) {

		} else {
      return {
        statusCode: 400,
        data: ['Invalid origin']
      }
		}
  })
}
