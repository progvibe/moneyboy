import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { tickers } from '@/db/schema'
import { fetchFinnhubSymbols } from '@/ingest/finnhub'

async function main() {
  const exchange = process.env.TICKER_EXCHANGE ?? 'US'
  console.log(`Fetching tickers for exchange ${exchange}...`)

  const symbols = await fetchFinnhubSymbols(exchange)
  if (symbols.length === 0) {
    console.log('No symbols returned.')
    return
  }

  const rows = symbols.map((item) => ({
    symbol: item.symbol.toUpperCase(),
    exchange,
    name: item.description ?? item.displaySymbol ?? null,
    active: true,
  }))

  const chunkSize = 1000
  let upserted = 0

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    await db
      .insert(tickers)
      .values(chunk)
      .onConflictDoUpdate({
        target: [tickers.symbol, tickers.exchange],
        set: {
          name: sql`excluded.name`,
          active: true,
        },
      })
    upserted += chunk.length
  }

  console.log(`Upserted ${upserted} tickers for ${exchange}.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
