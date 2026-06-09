'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Gym, Profile } from '@/lib/types'
import { SearchIcon, XIcon, BookmarkIcon } from '@/components/Icons'

// Dynamically imported to avoid SSR
let GlobeLib: any = null

interface GymPoint {
  id: string | number
  lat: number
  lng: number
  name: string
  address?: string | null
  isDB: boolean
  dbId?: number
}

interface Props {
  currentUserId?: string
  userGymId?: number | null
}

async function overpassSearch(lat: number, lon: number, radiusM = 6000): Promise<GymPoint[]> {
  const q = `[out:json][timeout:25];(node["leisure"="fitness_centre"](around:${radiusM},${lat},${lon});way["leisure"="fitness_centre"](around:${radiusM},${lat},${lon});node["amenity"="gym"](around:${radiusM},${lat},${lon});way["amenity"="gym"](around:${radiusM},${lat},${lon});node["sport"="fitness"](around:${radiusM},${lat},${lon}););out center;`
  try {
    const res = await fetch('/api/gyms', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.elements || [])
      .filter((el: any) => (el.lat || el.center?.lat) && el.tags?.name)
      .map((el: any) => ({
        id:      `op-${el.id}`,
        lat:     el.lat ?? el.center.lat,
        lng:     el.lon ?? el.center.lon,
        name:    el.tags.name,
        address: [el.tags['addr:street'], el.tags['addr:city']].filter(Boolean).join(', ') || null,
        isDB:    false,
      }))
  } catch { return [] }
}

export default function GlobeMap({ currentUserId, userGymId }: Props) {
  const globeEl   = useRef<HTMLDivElement>(null)
  const globeRef  = useRef<any>(null)
  const [ready, setReady]         = useState(false)
  const [dims, setDims]           = useState({ w: 0, h: 0 })
  const [gymPoints, setGymPoints] = useState<GymPoint[]>([])
  const [userRing, setUserRing]   = useState<any[]>([])
  const [selected, setSelected]   = useState<GymPoint | null>(null)
  const [members, setMembers]     = useState<Profile[]>([])
  const [memberships, setMemberships] = useState<Set<number>>(new Set())
  const [searchText, setSearchText]   = useState('')
  const [searching, setSearching]     = useState(false)
  const [msg, setMsg]             = useState('')
  const [joined, setJoined]       = useState(false)

  // Dimensions
  useEffect(() => {
    function update() { setDims({ w: window.innerWidth, h: window.innerHeight }) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Init globe after mount
  useEffect(() => {
    if (!globeEl.current) return
    let cancelled = false

    import('react-globe.gl').then(mod => {
      if (cancelled || !globeEl.current) return
      GlobeLib = mod.default

      const globe = GlobeLib()(globeEl.current)
      globe
        .globeImageUrl('https://unpkg.com/three-globe@2.33.0/example/img/earth-night.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe@2.33.0/example/img/earth-topology.png')
        .atmosphereColor('#c0392b')
        .atmosphereAltitude(0.14)
        .backgroundColor('rgba(6,6,6,1)')
        .pointsData([])
        .pointLat('lat')
        .pointLng('lng')
        .pointColor(() => '#e8453c')
        .pointAltitude(0.02)
        .pointRadius(0.45)
        .pointLabel((d: any) => d.name)
        .onPointClick((point: any) => handleSelect(point))
        .ringsData([])
        .ringLat('lat')
        .ringLng('lng')
        .ringColor(() => () => '#3b82f6')
        .ringMaxRadius(4)
        .ringPropagationSpeed(1.5)
        .ringRepeatPeriod(700)
        .width(window.innerWidth)
        .height(window.innerHeight - 64)
        .enablePointerInteraction(true)

      // Auto rotate
      globe.controls().autoRotate = true
      globe.controls().autoRotateSpeed = 0.4
      globe.controls().enableDamping = true

      globeRef.current = globe
      setReady(true)
    })

    return () => { cancelled = true }
  }, [])

  // Resize globe
  useEffect(() => {
    if (!globeRef.current || !dims.w) return
    globeRef.current.width(dims.w).height(dims.h - 64)
  }, [dims])

  // Update points when gymPoints change
  useEffect(() => {
    if (!ready || !globeRef.current) return
    globeRef.current.pointsData(gymPoints)
  }, [gymPoints, ready])

  // Update rings when userRing changes
  useEffect(() => {
    if (!ready || !globeRef.current) return
    globeRef.current.ringsData(userRing)
  }, [userRing, ready])

  // Load DB gyms + user memberships
  useEffect(() => {
    supabase.from('gyms').select('*').then(({ data }) => {
      const pts = (data || []).filter((g: Gym) => g.lat && g.lng).map((g: Gym) => ({
        id: `db-${g.id}`, lat: g.lat!, lng: g.lng!, name: g.name,
        address: g.address, isDB: true, dbId: g.id,
      }))
      setGymPoints(pts)
    })

    if (currentUserId) {
      supabase.from('gym_members').select('gym_id').eq('user_id', currentUserId)
        .then(({ data }) => setMemberships(new Set((data || []).map((r: any) => r.gym_id as number))))
    }

    navigator.geolocation?.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      setUserRing([{ lat, lng }])
      flyTo(lat, lng, 0.5)
      // Load local gyms
      overpassSearch(lat, lng).then(pts => setGymPoints(prev => merge(prev, pts)))
    }, undefined, { enableHighAccuracy: true, timeout: 8000 })
  }, [currentUserId])

  function flyTo(lat: number, lng: number, alt = 0.4) {
    if (!globeRef.current) return
    globeRef.current.controls().autoRotate = false
    globeRef.current.pointOfView({ lat, lng, altitude: alt }, 1600)
    setTimeout(() => { if (globeRef.current) globeRef.current.controls().autoRotate = true }, 5000)
  }

  function merge(existing: GymPoint[], incoming: GymPoint[]): GymPoint[] {
    const names = new Set(existing.map(g => g.name.toLowerCase()))
    return [...existing, ...incoming.filter(g => !names.has(g.name.toLowerCase()))]
  }

  const handleSelect = useCallback(async (point: GymPoint) => {
    if (!globeRef.current) return
    globeRef.current.controls().autoRotate = false
    setSelected(point)
    setMembers([])
    setJoined(false)

    if (point.dbId) {
      const { data } = await supabase.from('gym_members').select('profiles(*)').eq('gym_id', point.dbId).limit(5)
      setMembers(((data || []) as any[]).map(r => r.profiles).filter(Boolean))
      setJoined(memberships.has(point.dbId))
    }
  }, [memberships])

  const closeSelected = () => {
    setSelected(null)
    if (globeRef.current) globeRef.current.controls().autoRotate = true
  }

  const joinGym = async () => {
    if (!currentUserId || !selected) return
    if (selected.dbId && memberships.has(selected.dbId)) {
      // Leave
      setJoined(false)
      setMemberships(prev => { const s = new Set(prev); s.delete(selected.dbId!); return s })
      await supabase.from('gym_members').delete().eq('user_id', currentUserId).eq('gym_id', selected.dbId)
    } else {
      // Upsert gym if from Overpass
      let dbId = selected.dbId
      if (!dbId) {
        const { data } = await supabase.from('gyms').insert({ name: selected.name, address: selected.address, lat: selected.lat, lng: selected.lng }).select().single()
        if (data) { dbId = data.id; setGymPoints(prev => prev.map(p => p.id === selected.id ? { ...p, dbId: data.id, isDB: true } : p)) }
      }
      if (dbId) {
        setJoined(true)
        setMemberships(prev => new Set([...prev, dbId!]))
        await supabase.from('gym_members').insert({ user_id: currentUserId, gym_id: dbId })
        await supabase.from('profiles').update({ gym_id: dbId }).eq('id', currentUserId)
      }
    }
  }

  const search = async () => {
    if (!searchText.trim() || searching) return
    setSearching(true); setMsg('')
    try {
      const res  = await fetch(`/api/geocode?q=${encodeURIComponent(searchText.trim())}`)
      const data = await res.json()
      if (!data.length) { setMsg('Location not found.'); return }

      const { lat, lon, display_name } = data[0]
      const clat = parseFloat(lat), clng = parseFloat(lon)
      flyTo(clat, clng, 0.35)

      const pts = await overpassSearch(clat, clng, 8000)
      setGymPoints(prev => merge(prev, pts))

      const city = display_name.split(',')[0]
      setMsg(pts.length ? `${pts.length} gyms near ${city}` : `No gyms found near ${city}`)
    } catch { setMsg('Search failed — try again.') }
    finally { setSearching(false) }
  }

  return (
    <div className="relative w-full h-svh overflow-hidden bg-[#060606]">
      {/* Globe canvas */}
      <div ref={globeEl} className="absolute inset-0" />

      {/* Search bar */}
      <div className="absolute top-3 left-3 right-3 z-20">
        <div className="flex gap-2">
          <input type="text" placeholder="Search city or gym…" value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            className="input-dark py-2.5 text-sm flex-1"
            style={{ background: 'rgba(6,6,6,.88)', backdropFilter: 'blur(16px)' }} />
          <button onClick={search} disabled={searching}
            className="w-12 h-[46px] rounded-xl flex items-center justify-center flex-shrink-0 text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
            {searching
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : <SearchIcon size={18} />}
          </button>
        </div>
        {msg && <p className={`text-xs mt-1.5 px-1 drop-shadow ${msg.startsWith('No') || msg.includes('failed') ? 'text-red-b/80' : 'text-txt-3'}`}>{msg}</p>}
      </div>

      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#060606] z-10">
          <div className="w-8 h-8 border-2 border-red-p border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-txt-3 text-sm font-head">Loading globe…</p>
        </div>
      )}

      {/* Selected gym sheet */}
      {selected && (
        <div className="absolute bottom-20 left-3 right-3 z-30 slide-up"
          style={{ background: 'rgba(10,10,10,.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(192,57,43,.3)', borderRadius: 20, padding: 20 }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-head font-bold text-txt-1 text-base leading-tight">{selected.name}</h3>
              {selected.address && <p className="text-txt-3 text-xs mt-0.5">{selected.address}</p>}
            </div>
            <button onClick={closeSelected} className="text-txt-3 ml-3 flex-shrink-0"><XIcon size={20}/></button>
          </div>

          {/* Members */}
          {members.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex -space-x-2">
                {members.slice(0, 5).map(m => (
                  <div key={m.id} className="w-7 h-7 rounded-full border-2 overflow-hidden bg-bg-4 flex-shrink-0"
                    style={{ borderColor: '#0a0a0a' }}>
                    {m.avatar_url
                      ? <Image src={m.avatar_url} alt={m.username} width={28} height={28} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white bg-red-p">{m.username.charAt(0).toUpperCase()}</div>}
                  </div>
                ))}
              </div>
              <span className="text-txt-3 text-xs">{members.length} member{members.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          {!members.length && selected.isDB && <p className="text-txt-3 text-xs mb-4">Be the first to join!</p>}

          {currentUserId && (
            <button onClick={joinGym}
              className="w-full py-3 rounded-xl font-head font-bold text-sm uppercase tracking-wider transition-all text-white"
              style={joined
                ? { background: 'rgba(192,57,43,.15)', border: '1px solid rgba(192,57,43,.4)', color: '#e8453c' }
                : { background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
              {joined ? 'Leave Gym' : 'Join Gym'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
