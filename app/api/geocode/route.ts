import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 })

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`,
    {
      headers: {
        'User-Agent': 'SpotMe-App/1.0 (kavetr22@campbellhall.org)',
        'Accept': 'application/json',
        'Accept-Language': 'en',
      },
      next: { revalidate: 3600 },
    }
  )

  if (!res.ok) return NextResponse.json({ error: 'Geocoder error' }, { status: 502 })
  const data = await res.json()
  return NextResponse.json(data)
}
