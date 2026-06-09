'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Gym, Profile } from '@/lib/types'
import { SearchIcon, XIcon, MapPinIcon } from '@/components/Icons'

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

interface Suggestion {
  display_name: string
  lat: string
  lon: string
}

interface Props {
  currentUserId?: string
  userGymId?: number | null
}

async function overpassSearch(lat: number, lon: number, radiusM = 8000): Promise<GymPoint[]> {
  const q = `[out:json][timeout:25];(node["leisure"="fitness_centre"](around:${radiusM},${lat},${lon});way["leisure"="fitness_centre"](around:${radiusM},${lat},${lon});node["amenity"="gym"](around:${radiusM},${lat},${lon});way["amenity"="gym"](around:${radiusM},${lat},${lon});node["sport"="fitness"](around:${radiusM},${lat},${lon}););out center;`
  try {
    const res = await fetch('/api/gyms', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(q),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
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
  const globeEl  = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)

  const [ready, setReady]             = useState(false)
  const [gymPoints, setGymPoints]     = useState<GymPoint[]>([])
  const [userRing, setUserRing]       = useState<any[]>([])
  const [selected, setSelected]       = useState<GymPoint | null>(null)
  const [members, setMembers]         = useState<Profile[]>([])
  const [memberships, setMemberships] = useState<Set<number>>(new Set())
  const [joined, setJoined]           = useState(false)

  const [searchText, setSearchText]   = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSugg, setShowSugg]       = useState(false)
  const [searching, setSearching]     = useState(false)
  const [msg, setMsg]                 = useState('')

  /* ── Init globe ── */
  useEffect(() => {
    if (!globeEl.current) return
    let cancelled = false

    import('globe.gl').then(mod => {
      if (cancelled || !globeEl.current) return
      GlobeLib = mod.default ?? mod

      const w = globeEl.current.offsetWidth  || window.innerWidth
      const h = globeEl.current.offsetHeight || window.innerHeight

      const globe = GlobeLib()(globeEl.current)
      globe
        .globeImageUrl('https://unpkg.com/three-globe@2.33.0/example/img/earth-night.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe@2.33.0/example/img/earth-topology.png')
        .atmosphereColor('#c0392b')
        .atmosphereAltitude(0.14)
        .backgroundColor('rgba(6,6,6,1)')
        /* gym dots */
        .pointsData([])
        .pointLat('lat')
        .pointLng('lng')
        .pointColor(() => '#e8453c')
        .pointAltitude(0.025)
        .pointRadius(0.6)
        .pointLabel((d: any) =>
          `<div style="color:#fff;background:rgba(0,0,0,.8);padding:5px 10px;border-radius:10px;font-size:13px;font-weight:600;border:1px solid rgba(232,69,60,.4)">${d.name}</div>`
        )
        .onPointClick((pt: any) => selectGym(pt))
        /* user location rings */
        .ringsData([])
        .ringLat('lat')
        .ringLng('lng')
        .ringColor(() => () => '#3b82f6')
        .ringMaxRadius(4)
        .ringPropagationSpeed(1.5)
        .ringRepeatPeriod(700)
        .width(w)
        .height(h)
        .enablePointerInteraction(true)

      globe.controls().autoRotate      = true
      globe.controls().autoRotateSpeed = 0.45
      globe.controls().enableDamping   = true

      globeRef.current = globe
      setReady(true)
    })

    return () => { cancelled = true }
  }, [])

  /* ── Responsive resize ── */
  useEffect(() => {
    function onResize() {
      if (!globeRef.current || !globeEl.current) return
      globeRef.current.width(globeEl.current.offsetWidth).height(globeEl.current.offsetHeight)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /* ── Sync gym points to globe ── */
  useEffect(() => {
    if (ready && globeRef.current) globeRef.current.pointsData(gymPoints)
  }, [gymPoints, ready])

  /* ── Sync user ring to globe ── */
  useEffect(() => {
    if (ready && globeRef.current) globeRef.current.ringsData(userRing)
  }, [userRing, ready])

  /* ── Load DB gyms + memberships + geolocation ── */
  useEffect(() => {
    supabase.from('gyms').select('*').then(({ data }) => {
      const pts = (data || [])
        .filter((g: Gym) => g.lat && g.lng)
        .map((g: Gym) => ({ id: `db-${g.id}`, lat: g.lat!, lng: g.lng!, name: g.name, address: g.address, isDB: true, dbId: g.id }))
      setGymPoints(pts)
    })

    if (currentUserId) {
      supabase.from('gym_members').select('gym_id').eq('user_id', currentUserId)
        .then(({ data }) => setMemberships(new Set((data || []).map((r: any) => r.gym_id as number))))
    }

    navigator.geolocation?.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      setUserRing([{ lat, lng }])
      flyTo(lat, lng, 0.5, /* stopRotation */ false)
      overpassSearch(lat, lng).then(pts => setGymPoints(prev => merge(prev, pts)))
    }, undefined, { enableHighAccuracy: true, timeout: 8000 })
  }, [currentUserId]) // eslint-disable-line

  /* ── Autocomplete suggestions (debounced) ── */
  useEffect(() => {
    if (searchText.length < 2) { setSuggestions([]); setShowSugg(false); return }
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/geocode?q=${encodeURIComponent(searchText)}`)
        const data = await res.json()
        if (Array.isArray(data) && data.length) {
          setSuggestions(data.slice(0, 6))
          setShowSugg(true)
        } else {
          setSuggestions([])
          setShowSugg(false)
        }
      } catch { /* silent */ }
    }, 320)
    return () => clearTimeout(timer)
  }, [searchText])

  /* ── Helpers ── */
  function flyTo(lat: number, lng: number, alt = 0.35, stopRotation = true) {
    if (!globeRef.current) return
    if (stopRotation) globeRef.current.controls().autoRotate = false
    globeRef.current.pointOfView({ lat, lng, altitude: alt }, 1400)
    // ⬆ no setTimeout to re-enable — globe stays locked after a deliberate search/select
  }

  function merge(existing: GymPoint[], incoming: GymPoint[]): GymPoint[] {
    const names = new Set(existing.map(g => g.name.toLowerCase()))
    return [...existing, ...incoming.filter(g => !names.has(g.name.toLowerCase()))]
  }

  async function doSearchAt(lat: number, lon: number, label: string) {
    flyTo(lat, lon, 0.32)
    setSearching(true)
    setMsg('')
    const pts = await overpassSearch(lat, lon, 9000)
    setGymPoints(prev => merge(prev, pts))
    setMsg(pts.length
      ? `${pts.length} gym${pts.length !== 1 ? 's' : ''} found near ${label}`
      : `No gyms found near ${label} — try a nearby city`)
    setSearching(false)
  }

  /* ── Gym click ── */
  const selectGym = useCallback(async (point: GymPoint) => {
    globeRef.current?.controls() && (globeRef.current.controls().autoRotate = false)
    setSelected(point)
    setMembers([])
    setJoined(false)

    if (point.dbId) {
      const { data } = await supabase
        .from('gym_members').select('profiles(*)')
        .eq('gym_id', point.dbId).limit(5)
      setMembers(((data || []) as any[]).map(r => r.profiles).filter(Boolean))
      setJoined(memberships.has(point.dbId))
    }
  }, [memberships])

  /* ── Suggestion pick ── */
  const pickSuggestion = async (sug: Suggestion) => {
    const city = sug.display_name.split(',')[0]
    setSearchText(city)
    setSuggestions([])
    setShowSugg(false)
    await doSearchAt(parseFloat(sug.lat), parseFloat(sug.lon), city)
  }

  /* ── Manual search (Enter / button) ── */
  const handleSearch = async () => {
    if (!searchText.trim() || searching) return
    setShowSugg(false)
    setSearching(true)
    setMsg('')
    try {
      const res  = await fetch(`/api/geocode?q=${encodeURIComponent(searchText.trim())}`)
      const data = await res.json()
      if (!Array.isArray(data) || !data.length) {
        setMsg('Location not found — try a different city.')
        setSearching(false)
        return
      }
      const best = data[0]
      const city = best.display_name.split(',')[0]
      setSearchText(city)
      await doSearchAt(parseFloat(best.lat), parseFloat(best.lon), city)
    } catch {
      setMsg('Search failed — try again.')
      setSearching(false)
    }
  }

  /* ── Join / leave gym ── */
  const joinGym = async () => {
    if (!currentUserId || !selected) return

    if (selected.dbId && memberships.has(selected.dbId)) {
      // Leave
      setJoined(false)
      setMemberships(prev => { const s = new Set(prev); s.delete(selected.dbId!); return s })
      await supabase.from('gym_members').delete().eq('user_id', currentUserId).eq('gym_id', selected.dbId)
      await supabase.from('profiles').update({ gym_id: null }).eq('id', currentUserId)
    } else {
      // Join — upsert Overpass gym to DB first if needed
      let dbId = selected.dbId
      if (!dbId) {
        const { data } = await supabase
          .from('gyms')
          .insert({ name: selected.name, address: selected.address, lat: selected.lat, lng: selected.lng })
          .select().single()
        if (data) {
          dbId = data.id
          setGymPoints(prev => prev.map(p => p.id === selected.id ? { ...p, dbId: data.id, isDB: true } : p))
        }
      }
      if (dbId) {
        setJoined(true)
        setMemberships(prev => new Set([...prev, dbId!]))
        await supabase.from('gym_members').upsert({ user_id: currentUserId, gym_id: dbId })
        await supabase.from('profiles').update({ gym_id: dbId }).eq('id', currentUserId)
        setSelected(prev => prev ? { ...prev, dbId } : prev)
      }
    }
  }

  /* ── Render ── */
  return (
    <div className="relative w-full h-svh overflow-hidden bg-[#060606]">

      {/* Globe canvas — fills entire container */}
      <div ref={globeEl} className="absolute inset-0" />

      {/* ── Search bar + autocomplete ── */}
      <div className="absolute top-3 left-3 right-3 z-20" onMouseLeave={() => setShowSugg(false)}>
        <div className="flex gap-2">
          {/* Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search any city…"
              value={searchText}
              onChange={e => { setSearchText(e.target.value); if (!e.target.value) { setMsg(''); setSuggestions([]); setShowSugg(false) } }}
              onKeyDown={e => {
                if (e.key === 'Enter')  { setShowSugg(false); handleSearch() }
                if (e.key === 'Escape') setShowSugg(false)
                if (e.key === 'ArrowDown') setShowSugg(true)
              }}
              onFocus={() => suggestions.length > 0 && setShowSugg(true)}
              className="input-dark py-2.5 text-sm w-full pr-9"
              style={{ background: 'rgba(6,6,6,.92)', backdropFilter: 'blur(18px)' }}
            />
            {searchText && (
              <button
                onClick={() => { setSearchText(''); setSuggestions([]); setShowSugg(false); setMsg('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-3 hover:text-txt-1 transition-colors">
                <XIcon size={14} />
              </button>
            )}
          </div>
          {/* Search button */}
          <button
            onClick={() => { setShowSugg(false); handleSearch() }}
            disabled={searching}
            className="w-[46px] h-[46px] rounded-xl flex items-center justify-center flex-shrink-0 text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
            {searching
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <SearchIcon size={18} />}
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showSugg && suggestions.length > 0 && (
          <div className="mt-1.5 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'rgba(8,8,8,.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,.07)' }}>
            {suggestions.map((sug, i) => {
              const parts   = sug.display_name.split(',')
              const primary = parts[0].trim()
              const secondary = parts.slice(1, 3).join(',').trim()
              return (
                <button
                  key={i}
                  onMouseDown={() => pickSuggestion(sug)}  // mouseDown fires before input blur
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0">
                  <MapPinIcon size={14} className="flex-shrink-0" style={{ color: 'rgba(232,69,60,.6)' }} />
                  <div className="min-w-0">
                    <p className="text-txt-1 text-sm font-head font-bold truncate">{primary}</p>
                    {secondary && <p className="text-txt-3 text-[11px] truncate mt-0.5">{secondary}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Status message */}
        {msg && (
          <p className={`text-xs mt-2 px-1 drop-shadow font-head ${
            msg.startsWith('No') || msg.includes('failed') || msg.includes('not found')
              ? 'text-red-b/70'
              : 'text-white/50'
          }`}>{msg}</p>
        )}
      </div>

      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#060606] z-10">
          <div className="w-8 h-8 border-2 border-red-p border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-txt-3 text-sm font-head tracking-wide">Loading globe…</p>
        </div>
      )}

      {/* ── Gym info bottom sheet ── */}
      {selected && (
        <div
          className="absolute left-3 right-3 z-30 slide-up"
          style={{
            bottom: 'calc(4rem + 16px)',   // clears the bottom nav
            background: 'rgba(8,8,8,.97)',
            backdropFilter: 'blur(28px)',
            border: '1px solid rgba(192,57,43,.35)',
            borderRadius: 22,
            padding: 20,
          }}>

          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-3">
              <h3 className="font-head font-bold text-txt-1 text-base leading-snug">{selected.name}</h3>
              {selected.address && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <MapPinIcon size={12} style={{ color: 'rgba(232,69,60,.6)', flexShrink: 0 }} />
                  <p className="text-txt-3 text-xs leading-snug">{selected.address}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => { setSelected(null); globeRef.current?.controls() && (globeRef.current.controls().autoRotate = false) }}
              className="text-txt-3 hover:text-txt-1 transition-colors flex-shrink-0 mt-0.5">
              <XIcon size={20} />
            </button>
          </div>

          {/* Members row */}
          {members.length > 0 ? (
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex -space-x-2">
                {members.slice(0, 5).map(m => (
                  <div key={m.id} className="w-7 h-7 rounded-full border-[2px] overflow-hidden bg-bg-4 flex-shrink-0"
                    style={{ borderColor: '#080808' }}>
                    {m.avatar_url
                      ? <Image src={m.avatar_url} alt={m.username} width={28} height={28} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white bg-red-p">{m.username[0].toUpperCase()}</div>}
                  </div>
                ))}
              </div>
              <span className="text-txt-3 text-xs">{members.length} SpotMe member{members.length !== 1 ? 's' : ''} train here</span>
            </div>
          ) : (
            <p className="text-txt-3 text-xs mb-4">Be the first SpotMe member here! 💪</p>
          )}

          {/* Join / Leave button */}
          {currentUserId ? (
            <button
              onClick={joinGym}
              className="w-full py-3 rounded-xl font-head font-bold text-sm uppercase tracking-wider transition-all"
              style={joined
                ? { background: 'rgba(192,57,43,.12)', border: '1px solid rgba(192,57,43,.4)', color: '#e8453c' }
                : { background: 'linear-gradient(135deg,#c0392b,#e8453c)', color: '#fff' }}>
              {joined ? '✓ My Gym — Tap to Leave' : 'Set as My Gym'}
            </button>
          ) : (
            <p className="text-txt-3 text-xs text-center py-2">Sign in to join this gym</p>
          )}
        </div>
      )}
    </div>
  )
}
