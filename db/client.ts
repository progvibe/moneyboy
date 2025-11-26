import { cache } from 'react'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const createClient = cache(() => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set for the PlanetScale connection')
  }

  const client =
    globalThis.__drizzlePostgresClient ??
    postgres(url, {
      ssl: 'require',
      max: 3,
    })

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__drizzlePostgresClient = client
  }

  return drizzle(client, { schema })
})

declare global {
  // eslint-disable-next-line no-var
  var __drizzlePostgresClient: ReturnType<typeof postgres> | undefined
}

export const db = createClient()
