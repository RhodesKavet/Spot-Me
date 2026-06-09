'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Gym, Profile } from '@/lib/types'
import { SearchIcon, XIcon, MapPinIcon } from '@/components/Icons'

/* ── Textures ── */
const GLOBE_DAY   = 'https://unpkg.com/three-globe@2.33.0/example/img/earth-day.jpg'
const GLOBE_BUMP  = 'https://unpkg.com/three-globe@2.33.0/example/img/earth-topology.png'
const GLOBE_SPEC  = 'https://unpkg.com/three-globe@2.33.0/example/img/earth-water.png'

/* ── Types ── */
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
  type?: string
  address?: Record<string, string>
}
interface Props {
  currentUserId?: string
  userGymId?: number | null
}

/* ── Overpass gym search ── */
async function overpassSearch(lat: number, lon: number, radiusM = 12000): Promise<GymPoint[]> {
  // Comprehensive gym/fitness query — catches branded chains + independent gyms
  const q = `[out:json][timeout:30];(
    node["leisure"="fitness_centre"](around:${radiusM},${lat},${lon});
    way["leisure"="fitness_centre"](around:${radiusM},${lat},${lon});
    node["amenity"="gym"](around:${radiusM},${lat},${lon});
    way["amenity"="gym"](around:${radiusM},${lat},${lon});
    node["sport"="fitness"](around:${radiusM},${lat},${lon});
    way["sport"="fitness"](around:${radiusM},${lat},${lon});
    node["sport"="crossfit"](around:${radiusM},${lat},${lon});
    node["sport"="weightlifting"](around:${radiusM},${lat},${lon});
    node["leisure"="sports_centre"]["sport"~"fitness|crossfit|weightlifting|yoga|martial_arts",i](around:${radiusM},${lat},${lon});
    node["name"~"gym|fitness|crossfit|YMCA|equinox|planet fitness|anytime fitness|la fitness|orange theory|f45",i](around:${radiusM},${lat},${lon})[!"leisure"][!"amenity"];
  );out center;`
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

function merge(existing: GymPoint[], incoming: GymPoint[]): GymPoint[] {
  const names = new Set(existing.map(g => g.name.toLowerCase()))
  return [...existing, ...incoming.filter(g => !names.has(g.name.toLowerCase()))]
}

/* ── Highlight matched text in suggestions ── */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.substring(0, idx)}
      <span style={{ color: '#e8453c', fontWeight: 700 }}>{text.substring(idx, idx + query.length)}</span>
      {text.substring(idx + query.length)}
    </>
  )
}

/* ─────────────────────────────────────────────────────── */

export default function GlobeMap({ currentUserId, userGymId }: Props) {
  const globeEl  = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)

  const [ready, setReady]               = useState(false)
  const [gymPoints, setGymPoints]       = useState<GymPoint[]>([])
  const [userRing, setUserRing]         = useState<any[]>([])
  const [selected, setSelected]         = useState<GymPoint | null>(null)
  const [members, setMembers]           = useState<Profile[]>([])
  const [memberships, setMemberships]   = useState<Set<number>>(new Set())
  const [joined, setJoined]             = useState(false)

  const [searchText, setSearchText]     = useState('')
  const [suggestions, setSuggestions]   = useState<Suggestion[]>([])
  const [showSugg, setShowSugg]         = useState(false)
  const [searching, setSearching]       = useState(false)
  const [msg, setMsg]                   = useState('')
  const [bgLoading, setBgLoading]       = useState(false)   // background gym load

  const panSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchedZones  = useRef<Set<string>>(new Set())       // throttle repeat queries

  /* ─── Init globe ─── */
  useEffect(() => {
    if (!globeEl.current) return
    let cancelled = false

    Promise.all([
      import('globe.gl'),
      import('three'),
    ]).then(([globeMod, THREE]) => {
      if (cancelled || !globeEl.current) return
      const GlobeLib: any = globeMod.default ?? globeMod

      const w = globeEl.current.offsetWidth  || window.innerWidth
      const h = globeEl.current.offsetHeight || window.innerHeight

      const globe = GlobeLib()(globeEl.current)
      globe
        /* ── Satellite texture ── */
        .globeImageUrl(GLOBE_DAY)
        .bumpImageUrl(GLOBE_BUMP)
        .atmosphereColor('#88c0f0')      // realistic light-blue atmosphere
        .atmosphereAltitude(0.13)
        .backgroundColor('rgba(0,0,0,1)')
        /* ── Gym dots ── */
        .pointsData([])
        .pointLat('lat')
        .pointLng('lng')
        .pointColor(() => '#e8453c')
        .pointAltitude(0.018)
        .pointRadius(0.55)
        .pointLabel((d: any) =>
          `<div style="color:#fff;background:rgba(0,0,0,.85);padding:5px 10px;border-radius:10px;font-size:13px;font-weight:600;border:1px solid rgba(232,69,60,.4);white-space:nowrap">${d.name}</div>`
        )
        .onPointClick((pt: any) => selectGym(pt))
        /* ── User location ring ── */
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

      /* ── Controls: deep zoom + damping ── */
      const ctrl = globe.controls()
      ctrl.autoRotate      = true
      ctrl.autoRotateSpeed = 0.4
      ctrl.enableDamping   = true
      ctrl.dampingFactor   = 0.08
      ctrl.minDistance     = 101.5   // just above surface (globe radius = 100)
      ctrl.maxDistance     = 600
      ctrl.zoomSpeed       = 1.4
      ctrl.rotateSpeed     = 0.55
      ctrl.panSpeed        = 0.3

      globeRef.current = globe

      /* ── Star field ── */
      const starCount = 10000
      const positions = new Float32Array(starCount * 3)
      for (let i = 0; i < starCount; i++) {
        // Random point on unit sphere, scaled to star shell distance
        const u = Math.random()
        const v = Math.random()
        const theta = 2 * Math.PI * u
        const phi   = Math.acos(2 * v - 1)
        const r     = 250 + Math.random() * 900  // 250–1150 units out
        positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
        positions[i * 3 + 2] = r * Math.cos(phi)
      }
      const starGeo = new THREE.BufferGeometry()
      starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

      // Vary star sizes slightly for realism
      const sizes = new Float32Array(starCount)
      for (let i = 0; i < starCount; i++) sizes[i] = 0.25 + Math.random() * 0.9
      starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

      const starMat = new THREE.PointsMaterial({
        color:           0xffffff,
        size:            0.55,
        sizeAttenuation: true,
        transparent:     true,
        opacity:         0.85,
      })
      const stars = new THREE.Points(starGeo, starMat)
      globe.scene().add(stars)

      /* ── Auto-load gyms when globe stops panning ── */
      ctrl.addEventListener('end', () => {
        const pov = globe.pointOfView()
        if (!pov || pov.altitude > 0.45) return   // too far out — skip

        // Zone key: ~2° grid cell
        const zoneKey = `${(pov.lat / 2 | 0)}_${(pov.lng / 2 | 0)}`
        if (searchedZones.current.has(zoneKey)) return
        searchedZones.current.add(zoneKey)

        setBgLoading(true)
        overpassSearch(pov.lat, pov.lng, 12000).then(pts => {
          setGymPoints(prev => merge(prev, pts))
          setBgLoading(false)
        })
      })

      setReady(true)
    })

    return () => { cancelled = true }
  }, []) // eslint-disable-line

  /* ── Responsive resize ── */
  useEffect(() => {
    const onResize = () => {
      if (!globeRef.current || !globeEl.current) return
      globeRef.current.width(globeEl.current.offsetWidth).height(globeEl.current.offsetHeight)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /* ── Sync gym points ── */
  useEffect(() => {
    if (ready && globeRef.current) globeRef.current.pointsData(gymPoints)
  }, [gymPoints, ready])

  /* ── Sync user ring ── */
  useEffect(() => {
    if (ready && globeRef.current) globeRef.current.ringsData(userRing)
  }, [userRing, ready])

  /* ── Load DB gyms + memberships + geolocation ── */
  useEffect(() => {
    supabase.from('gyms').select('*').then(({ data }) => {
      const pts = (data || [])
        .filter((g: Gym) => g.lat && g.lng)
        .map((g: Gym) => ({
          id: `db-${g.id}`, lat: g.lat!, lng: g.lng!,
          name: g.name, address: g.address, isDB: true, dbId: g.id,
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
      flyTo(lat, lng, 0.45, false)   // fly to location, keep auto-rotate
      overpassSearch(lat, lng, 12000).then(pts => setGymPoints(prev => merge(prev, pts)))
    }, undefined, { enableHighAccuracy: true, timeout: 8000 })
  }, [currentUserId]) // eslint-disable-line

  /* ── Autocomplete: fire from 1 char, 150ms debounce ── */
  useEffect(() => {
    if (!searchText.trim()) { setSuggestions([]); setShowSugg(false); return }
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/geocode?q=${encodeURIComponent(searchText.trim())}`)
        const data = await res.json()
        if (Array.isArray(data) && data.length) {
          setSuggestions(data)
          setShowSugg(true)
        } else {
          setSuggestions([])
          setShowSugg(false)
        }
      } catch { /* silent */ }
    }, 150)   // fast autocomplete
    return () => clearTimeout(timer)
  }, [searchText])

  /* ── Helpers ── */
  function flyTo(lat: number, lng: number, alt = 0.32, stopRotation = true) {
    if (!globeRef.current) return
    if (stopRotation) globeRef.current.controls().autoRotate = false
    globeRef.current.pointOfView({ lat, lng, altitude: alt }, 1400)
  }

  async function doSearchAt(lat: number, lon: number, label: string) {
    flyTo(lat, lon, 0.28)
    setSearching(true)
    setMsg('')
    const pts = await overpassSearch(lat, lon, 12000)
    setGymPoints(prev => merge(prev, pts))
    setMsg(pts.length
      ? `${pts.length} gym${pts.length !== 1 ? 's' : ''} found near ${label}`
      : `No gyms found near ${label} — try a nearby city`)
    setSearching(false)
  }

  /* ── Gym click ── */
  const selectGym = useCallback(async (point: GymPoint) => {
    if (globeRef.current) globeRef.current.controls().autoRotate = false
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
    // Build a nice short name: City, State/Country
    const parts = sug.display_name.split(',').map(p => p.trim())
    const label = parts.slice(0, 2).join(', ')
    setSearchText(label)
    setSuggestions([])
    setShowSugg(false)
    await doSearchAt(parseFloat(sug.lat), parseFloat(sug.lon), label)
  }

  /* ── Manual search (Enter / button) ── */
  const handleSearch = async () => {
    if (!searchText.trim() || searching) return
    setShowSugg(false)
    // If there's a top suggestion, use it immediately
    if (suggestions.length > 0) {
      await pickSuggestion(suggestions[0])
      return
    }
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
      await pickSuggestion(data[0])
    } catch {
      setMsg('Search failed — try again.')
      setSearching(false)
    }
  }

  /* ── Join / leave gym ── */
  const joinGym = async () => {
    if (!currentUserId || !selected) return
    if (selected.dbId && memberships.has(selected.dbId)) {
      setJoined(false)
      setMemberships(prev => { const s = new Set(prev); s.delete(selected.dbId!); return s })
      await supabase.from('gym_members').delete().eq('user_id', currentUserId).eq('gym_id', selected.dbId)
      await supabase.from('profiles').update({ gym_id: null }).eq('id', currentUserId)
    } else {
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

  /* ─────────────── Render ─────────────── */
  return (
    /* Pure black space background behind the globe */
    <div className="relative w-full h-svh overflow-hidden" style={{ background: '#000' }}>

      {/* Globe canvas */}
      <div ref={globeEl} className="absolute inset-0" />

      {/* ── Search bar ── */}
      <div className="absolute top-3 left-3 right-3 z-20" onMouseLeave={() => setTimeout(() => setShowSugg(false), 120)}>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search any city, country…"
              value={searchText}
              onChange={e => {
                setSearchText(e.target.value)
                if (!e.target.value) { setMsg(''); setSuggestions([]); setShowSugg(false) }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter')    { setShowSugg(false); handleSearch() }
                if (e.key === 'Escape')   setShowSugg(false)
                if (e.key === 'ArrowDown' && suggestions.length) setShowSugg(true)
              }}
              onFocus={() => suggestions.length > 0 && setShowSugg(true)}
              className="w-full text-sm py-3 pl-4 pr-10 rounded-xl font-head font-bold text-txt-1 placeholder-txt-3 outline-none transition-all"
              style={{
                background:     'rgba(6,6,6,.92)',
                backdropFilter: 'blur(20px)',
                border:         '1px solid rgba(255,255,255,.08)',
              }}
            />
            {searchText ? (
              <button
                onClick={() => { setSearchText(''); setSuggestions([]); setShowSugg(false); setMsg('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-3 hover:text-txt-1 transition-colors">
                <XIcon size={14} />
              </button>
            ) : (
              <SearchIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(255,255,255,.2)' }} />
            )}
          </div>

          {/* Search button */}
          <button
            onClick={() => { setShowSugg(false); handleSearch() }}
            disabled={searching || !searchText.trim()}
            className="w-[46px] h-[46px] rounded-xl flex items-center justify-center flex-shrink-0 text-white transition-all disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)', backdropFilter: 'blur(12px)' }}>
            {searching
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <SearchIcon size={17} />}
          </button>
        </div>

        {/* ── Autocomplete dropdown ── */}
        {showSugg && suggestions.length > 0 && (
          <div className="mt-1.5 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'rgba(6,6,6,.97)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,.07)' }}>
            {suggestions.map((sug, i) => {
              const parts     = sug.display_name.split(',')
              const primary   = parts[0].trim()
              const secondary = parts.slice(1, 3).map(s => s.trim()).join(', ')
              return (
                <button
                  key={i}
                  onMouseDown={() => pickSuggestion(sug)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-white/[0.03] last:border-0"
                  style={{ background: i === 0 ? 'rgba(255,255,255,.025)' : 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? 'rgba(255,255,255,.025)' : 'transparent')}>
                  <MapPinIcon size={13} className="flex-shrink-0" style={{ color: i === 0 ? '#e8453c' : 'rgba(192,57,43,.45)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-txt-1 text-sm font-head font-bold truncate leading-tight">
                      <HighlightMatch text={primary} query={searchText} />
                    </p>
                    {secondary && (
                      <p className="text-txt-3 text-[11px] truncate mt-0.5 leading-tight">{secondary}</p>
                    )}
                  </div>
                  {i === 0 && (
                    <span className="text-[9px] font-head font-bold uppercase tracking-widest flex-shrink-0"
                      style={{ color: 'rgba(232,69,60,.6)' }}>Best</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Status / hint */}
        {msg && (
          <p className={`text-xs mt-2 px-1 drop-shadow font-head ${
            msg.startsWith('No') || msg.includes('failed') || msg.includes('not found')
              ? 'text-red-b/70' : 'text-white/40'
          }`}>{msg}</p>
        )}

        {/* Background gym-loading indicator */}
        {bgLoading && !searching && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="w-2.5 h-2.5 border border-red-p/50 border-t-red-b rounded-full animate-spin" />
            <p className="text-[11px] text-white/30 font-head">Loading gyms in view…</p>
          </div>
        )}
      </div>

      {/* Gym count badge */}
      {ready && gymPoints.length > 0 && (
        <div className="absolute top-[68px] left-3 z-10 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.07)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#e8453c' }} />
            <span className="text-[11px] font-head font-bold text-white/50">
              {gymPoints.length} gym{gymPoints.length !== 1 ? 's' : ''} loaded
            </span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ background: '#000' }}>
          <div className="w-8 h-8 border-2 border-red-p border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-txt-3 text-sm font-head tracking-wide">Loading globe…</p>
        </div>
      )}

      {/* ── Gym info bottom sheet ── */}
      {selected && (
        <div className="absolute left-3 right-3 z-30 slide-up"
          style={{
            bottom:         'calc(4rem + 16px)',
            background:     'rgba(6,6,6,.97)',
            backdropFilter: 'blur(28px)',
            border:         '1px solid rgba(192,57,43,.3)',
            borderRadius:   22,
            padding:        20,
          }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-3">
              <h3 className="font-head font-bold text-txt-1 text-base leading-snug">{selected.name}</h3>
              {selected.address && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <MapPinIcon size={12} style={{ color: 'rgba(232,69,60,.55)', flexShrink: 0 }} />
                  <p className="text-txt-3 text-xs leading-snug">{selected.address}</p>
                </div>
              )}
            </div>
            <button onClick={() => setSelected(null)} className="text-txt-3 hover:text-txt-1 transition-colors flex-shrink-0 mt-0.5">
              <XIcon size={20} />
            </button>
          </div>

          {members.length > 0 ? (
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex -space-x-2">
                {members.slice(0, 5).map(m => (
                  <div key={m.id} className="w-7 h-7 rounded-full border-[2px] overflow-hidden bg-bg-4 flex-shrink-0"
                    style={{ borderColor: '#060606' }}>
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

          {currentUserId ? (
            <button onClick={joinGym}
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
