import 'dotenv/config'
import { db } from '@/db/client'
import { importantTickers } from '@/db/schema'

const DEFAULT_LIMIT = 200
const STATIC_TICKERS = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'GOOG', 'META', 'BRK.B', 'TSLA',
  'UNH', 'JPM', 'V', 'LLY', 'XOM', 'MA', 'JNJ', 'WMT', 'PG', 'AV',
  'HD', 'ORCL', 'COST', 'MRK', 'ABBV', 'CVX', 'PEP', 'KO', 'BAC', 'AMD', 'TMO',
  'CRM', 'ACN', 'MCD', 'CSCO', 'DIS',
  'WFC', 'ABT', 'DHR', 'TXN', 'LIN', 'BMY', 'QCOM', 'PM',
  'NEE', 'RTX', 'AMGN', 'IBM', 'UPS', 'MS', 'HON',
  'GS', 'CAT', 'INTU', 'AMAT', 'NOW', 'LOW', 'DE',
  'SBUX', 'UNP', 'GE', 'BKNG', 'SPGI', 'BLK',
  'AXP', 'ADP', 'TJX', 'PLD', 'ISRG', 'GILD', 'LRCX',
  'MDLZ', 'C', 'CVS', 'SYK', 'CB', 'MMC', 'PGR',
  'VRTX', 'CI', 'REGN', 'TGT', 'MU', 'FIS',
  'ZTS', 'EOG', 'MO', 'ETN', 'SCHW', 'ICE',
  'BDX', 'PANW', 'ELV', 'NOC', 'SO', 'ITW',
  'SLB', 'APD', 'KLAC', 'CME', 'WM', 'ADI',
  'EQIX', 'MCO', 'SNPS', 'HCA', 'USB', 'EMR',
  'COP', 'TFC', 'CSX', 'NSC', 'ROP', 'GD',
  'FDX', 'AON', 'PSX', 'MAR', 'NXPI',
  'ORLY', 'MPC', 'PAYX', 'OXY', 'PCAR',
]

type Args = {
  limit: number
}

function parseArgs(argv: string[]): Args {
  let limit = DEFAULT_LIMIT

  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i]
    if (!raw.startsWith('--')) continue
    const [flag, inlineValue] = raw.split('=')
    const value = inlineValue ?? argv[i + 1]
    if (!value) continue

    if (flag === '--limit') {
      limit = Math.max(1, Number.parseInt(value, 10) || DEFAULT_LIMIT)
      if (!inlineValue) i++
    }
  }

  return { limit }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const list = STATIC_TICKERS.slice(0, args.limit)
  if (list.length === 0) {
    throw new Error('No tickers found to seed.')
  }

  for (let i = 0; i < list.length; i++) {
    const symbol = list[i]
    const rank = i + 1
    await db
      .insert(importantTickers)
      .values({ symbol, rank })
      .onConflictDoUpdate({
        target: [importantTickers.symbol],
        set: { rank },
      })
  }

  console.log(`Seeded ${list.length} important tickers.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
