import 'dotenv/config'
import { getDashboardThemes } from '@/lib/queries/dashboard-themes'

type Args = {
  window?: string
  k?: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = {}
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i]
    if (!raw.startsWith('--')) continue
    const [flag, inlineValue] = raw.split('=')
    const value = inlineValue ?? argv[i + 1]
    if (!value) continue

    if (flag === '--window') {
      args.window = value
      if (!inlineValue) i++
    }

    if (flag === '--k') {
      args.k = value
      if (!inlineValue) i++
    }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const payload = await getDashboardThemes({
    window: args.window ?? null,
    k: args.k ?? null,
  })
  console.log(JSON.stringify(payload, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
