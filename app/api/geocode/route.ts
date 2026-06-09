import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 1) return NextResponse.json({ error: 'Missing q' }, { status: 400 })

  // Use broader search params for autocomplete quality
  const params = new URLSearchParams({
    q: q.trim(),
    format:         'json',
    limit:          '10',
    addressdetails: '1',
    namedetails:    '1',
    // Bias towards populated places
    featuretype:    'city,town,village,county,state,country',
  })

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'User-Agent':      'SpotMe-App/1.0 (kavetr22@campbellhall.org)',
        'Accept':          'application/json',
        'Accept-Language': 'en',
        'Referer':         'https://spotme.app',
      },
      next: { revalidate: 60 }, // shorter cache so autocomplete stays fresh
    }
  )

  if (!res.ok) return NextResponse.json({ error: 'Geocoder error' }, { status: 502 })
  const raw: any[] = await res.json()

  // Deduplicate by display_name and sort: cities/towns first
  const ORDER: Record<string, number> = {
    city: 0, town: 1, village: 2, county: 3, state: 4, country: 5,
  }
  const seen = new Set<string>()
  const results = raw
    .filter(r => {
      const key = r.display_name
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => {
      const oa = ORDER[a.type] ?? 9
      const ob = ORDER[b.type] ?? 9
      if (oa !== ob) return oa - ob
      return parseFloat(b.importance ?? 0) - parseFloat(a.importance ?? 0)
    })
    .slice(0, 10)

  return NextResponse.json(results)
}
