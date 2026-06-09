import { NextRequest, NextResponse } from 'next/server'

// Proxy Overpass API requests server-side to avoid CORS/User-Agent browser restrictions
export async function POST(req: NextRequest) {
  const body = await req.text()

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SpotMe-App/1.0 (kavetr22@campbellhall.org)',
        },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) continue
      const data = await res.json()
      return NextResponse.json(data)
    } catch {
      continue
    }
  }

  return NextResponse.json({ error: 'Overpass unavailable' }, { status: 503 })
}
