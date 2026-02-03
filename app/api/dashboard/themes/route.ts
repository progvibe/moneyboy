import { NextResponse } from 'next/server'
import { getDashboardThemes, parseThemeCount, parseWindowHours } from '@/lib/queries/dashboard-themes'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const windowParam = searchParams.get('window')
    const kParam = searchParams.get('k')

    const windowHours = parseWindowHours(windowParam)
    const themeCount = parseThemeCount(kParam)

    const payload = await getDashboardThemes({
      windowHours,
      themeCount,
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('dashboard themes error', error)
    return NextResponse.json({ error: 'Failed to build themes' }, { status: 500 })
  }
}
