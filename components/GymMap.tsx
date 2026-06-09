'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Gym, Profile } from '@/lib/types'
import { SearchIcon } from '@/components/Icons'

// @ts-expect-error leaflet private
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const gymIcon = L.divIcon({
  html: `<div style="
    width:34px;height:34px;background:linear-gradient(135deg,#c0392b,#e8453c);
    border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-size:17px;box-shadow:0 2px 12px rgba(192,57,43,.7),0 0 0 2px rgba(255,255,255,.2);
    cursor:pointer;line-height:1;">💪</div>`,
  iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -36], className: '',
})
const userIcon = L.divIcon({
  html: `<div style="
    width:16px;height:16px;border-radius:50%;background:#3b82f6;
    border:2.5px solid #fff;box-shadow:0 0 0 3px rgba(59,130,246,.3),0 0 12px rgba(59,130,246,.6)">
  </div>`,
  iconSize: [16, 16], iconAnchor: [8, 8], className: '',
})

interface OverpassGym { id: number; lat: number; lon: number; tags: Record<string, string> }

interface Props {
  currentUserId?: string
  userGymId?: number | null
}

async function overpassQuery(query: string): Promise<OverpassGym[]> {
  const res = await fetch('/api/gyms', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.elements || [])
    .filter((el: any) => (el.lat || el.center?.lat) && el.tags?.name)
    .map((el: any) => ({ id: el.id, lat: el.lat ?? el.center.lat, lon: el.lon ?? el.center.lon, tags: el.tags || {} }))
}

// Sub-component: listens to map move events
function ViewportLoader({ onBoundsChange }: { onBoundsChange: (b: L.LatLngBounds, z: number) => void }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds(), map.getZoom()),
    zoomend: () => onBoundsChange(map.getBounds(), map.getZoom()),
  })
  return null
}

// Sub-component: gym popup content with member fetch
function GymPopupContent({ gym, currentUserId, isMember, onToggle }:
  { gym: Gym; currentUserId?: string; isMember: boolean; onToggle: (g: Gym) => void }) {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('gym_members').select('profiles(*)').eq('gym_id', gym.id).limit(5)
      .then(({ data }) => {
        setMembers(((data || []) as any[]).map(r => r.profiles).filter(Boolean))
        setLoading(false)
      })
  }, [gym.id])

  return (
    <div className="p-4 min-w-[210px]">
      <p className="font-head font-bold text-txt-1 text-sm mb-0.5 pr-4">{gym.name}</p>
      {gym.address && <p className="text-txt-3 text-xs mb-3">{gym.address}</p>}

      {/* Members */}
      <div className="flex items-center gap-2 mb-3">
        {loading ? (
          <div className="shimmer h-4 w-28 rounded-full" />
        ) : members.length > 0 ? (
          <>
            <div className="flex -space-x-2">
              {members.slice(0, 5).map(m => (
                <div key={m.id} className="w-7 h-7 rounded-full border-2 border-bg-2 overflow-hidden bg-bg-4 flex-shrink-0">
                  {m.avatar_url
                    ? <Image src={m.avatar_url} alt={m.username} width={28} height={28} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white bg-red-p">{m.username.charAt(0).toUpperCase()}</div>
                  }
                </div>
              ))}
            </div>
            <span className="text-txt-3 text-xs">{members.length} member{members.length !== 1 ? 's' : ''}</span>
          </>
        ) : (
          <span className="text-txt-3 text-xs">Be the first to join!</span>
        )}
      </div>

      {currentUserId && (
        <button onClick={() => onToggle(gym)}
          className={`w-full py-2.5 rounded-xl text-xs font-head font-bold uppercase tracking-wider transition-all ${
            isMember
              ? 'border border-red-p/50 text-red-b bg-red-p/10'
              : 'text-white'
          }`}
          style={!isMember ? { background: 'linear-gradient(135deg,#c0392b,#e8453c)' } : undefined}>
          {isMember ? 'Leave Gym' : 'Join Gym'}
        </button>
      )}
    </div>
  )
}

function OverpassPopupContent({ og, currentUserId, onJoin }:
  { og: OverpassGym; currentUserId?: string; onJoin: (og: OverpassGym) => void }) {
  return (
    <div className="p-4 min-w-[210px]">
      <p className="font-head font-bold text-txt-1 text-sm mb-0.5 pr-4">{og.tags.name}</p>
      {(og.tags['addr:street'] || og.tags['addr:city']) && (
        <p className="text-txt-3 text-xs mb-1">{[og.tags['addr:street'], og.tags['addr:city']].filter(Boolean).join(', ')}</p>
      )}
      {og.tags['opening_hours'] && <p className="text-txt-3 text-xs mb-3">🕐 {og.tags['opening_hours']}</p>}
      <div className="mb-3" />
      {currentUserId && (
        <button onClick={() => onJoin(og)}
          className="w-full py-2.5 rounded-xl text-xs font-head font-bold uppercase tracking-wider text-white"
          style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
          Join Gym
        </button>
      )}
    </div>
  )
}

export default function GymMap({ currentUserId, userGymId }: Props) {
  const [dbGyms, setDbGyms]           = useState<Gym[]>([])
  const [viewportGyms, setViewportGyms] = useState<OverpassGym[]>([])
  const [memberships, setMemberships] = useState<Set<number>>(new Set())
  const [userLoc, setUserLoc]         = useState<[number, number] | null>(null)
  const [center, setCenter]           = useState<[number, number]>([20, 0])
  const [zoom, setZoom]               = useState(2)
  const [searchText, setSearchText]   = useState('')
  const [searching, setSearching]     = useState(false)
  const [searchMsg, setSearchMsg]     = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.from('gyms').select('*').then(({ data }) => setDbGyms((data as Gym[]) || []))
    if (currentUserId) {
      supabase.from('gym_members').select('gym_id').eq('user_id', currentUserId)
        .then(({ data }) => setMemberships(new Set((data || []).map((r: any) => r.gym_id as number))))
    }
    navigator.geolocation?.getCurrentPosition(pos => {
      const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]
      setUserLoc(loc); setCenter(loc); setZoom(13)
      // Auto-load gyms around user location
      loadViewportGyms(pos.coords.latitude - 0.05, pos.coords.longitude - 0.05,
        pos.coords.latitude + 0.05, pos.coords.longitude + 0.05, 13)
    }, undefined, { enableHighAccuracy: true, timeout: 8000 })
  }, [currentUserId])

  const loadViewportGyms = useCallback(async (s: number, w: number, n: number, e: number, z: number) => {
    if (z < 11) return // don't query when zoomed very far out
    const q = `[out:json][timeout:20];(node["leisure"="fitness_centre"](${s},${w},${n},${e});way["leisure"="fitness_centre"](${s},${w},${n},${e});node["amenity"="gym"](${s},${w},${n},${e});way["amenity"="gym"](${s},${w},${n},${e}););out center;`
    const gyms = await overpassQuery(q)
    setViewportGyms(gyms)
  }, [])

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds, z: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      loadViewportGyms(bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast(), z)
    }, 800)
  }, [loadViewportGyms])

  const searchGyms = async () => {
    if (!searchText.trim()) return
    setSearching(true); setSearchMsg('')

    try {
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(searchText.trim())}`)
      const geoData = await geoRes.json()
      if (!geoData.length) { setSearchMsg('Location not found.'); return }

      const { lat, lon, display_name } = geoData[0]
      const clat = parseFloat(lat), clon = parseFloat(lon)
      const r = 5000

      const q = `[out:json][timeout:25];(node["leisure"="fitness_centre"](around:${r},${clat},${clon});way["leisure"="fitness_centre"](around:${r},${clat},${clon});node["amenity"="gym"](around:${r},${clat},${clon});way["amenity"="gym"](around:${r},${clat},${clon});node["sport"="fitness"](around:${r},${clat},${clon}););out center;`
      const gyms = await overpassQuery(q)

      setViewportGyms(gyms)
      setCenter([clat, clon]); setZoom(14)
      const city = display_name.split(',')[0]
      setSearchMsg(gyms.length ? `${gyms.length} gyms near ${city}` : `No gyms found near ${city}`)
    } catch {
      setSearchMsg('Search failed — try again.')
    } finally {
      setSearching(false)
    }
  }

  const toggleMembership = async (gym: Gym) => {
    if (!currentUserId) return
    if (memberships.has(gym.id)) {
      setMemberships(prev => { const s = new Set(prev); s.delete(gym.id); return s })
      await supabase.from('gym_members').delete().eq('user_id', currentUserId).eq('gym_id', gym.id)
    } else {
      setMemberships(prev => new Set([...prev, gym.id]))
      await supabase.from('gym_members').insert({ user_id: currentUserId, gym_id: gym.id })
      await supabase.from('profiles').update({ gym_id: gym.id }).eq('id', currentUserId)
    }
  }

  const claimAndJoin = async (og: OverpassGym) => {
    if (!currentUserId) return
    const name    = og.tags.name
    const address = [og.tags['addr:street'], og.tags['addr:city']].filter(Boolean).join(', ') || null
    let { data: existing } = await supabase.from('gyms').select('*').ilike('name', name).limit(1).maybeSingle()
    if (!existing) {
      const { data } = await supabase.from('gyms').insert({ name, address, lat: og.lat, lng: og.lon }).select().single()
      existing = data
    }
    if (existing) {
      setDbGyms(prev => prev.find(g => g.id === existing!.id) ? prev : [...prev, existing!])
      toggleMembership(existing as Gym)
    }
  }

  return (
    <div className="relative h-svh pb-16 flex flex-col">
      {/* Search */}
      <div className="px-3 pt-3 pb-2 z-[1001] flex-shrink-0"
        style={{ background: 'rgba(6,6,6,.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div className="flex gap-2">
          <input type="text" placeholder="Search city or gym…" value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchGyms()}
            className="input-dark py-2.5 text-sm flex-1" />
          <button onClick={searchGyms} disabled={searching}
            className="w-12 h-[46px] rounded-xl flex items-center justify-center flex-shrink-0 text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
            {searching
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <SearchIcon size={18} />}
          </button>
        </div>
        {searchMsg && <p className={`text-xs mt-1.5 px-1 ${searchMsg.startsWith('No') || searchMsg.includes('failed') ? 'text-red-b/70' : 'text-txt-3'}`}>{searchMsg}</p>}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', background: '#0d1117' }}
          zoomControl>
          <ViewportLoader onBoundsChange={handleBoundsChange} />

          {/* Satellite imagery base */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, IGN, IGP, UPR-EGP'
            maxZoom={17}
          />
          {/* Dark labels overlay */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            maxZoom={17}
          />

          {userLoc && <Marker position={userLoc} icon={userIcon}><Popup><p className="px-3 py-2 text-sm font-head font-bold text-txt-2">📍 You are here</p></Popup></Marker>}

          {/* DB gyms */}
          {dbGyms.filter(g => g.lat && g.lng).map(gym => (
            <Marker key={`db-${gym.id}`} position={[gym.lat!, gym.lng!]} icon={gymIcon}>
              <Popup>
                <GymPopupContent gym={gym} currentUserId={currentUserId}
                  isMember={memberships.has(gym.id)} onToggle={toggleMembership} />
              </Popup>
            </Marker>
          ))}

          {/* Viewport / search Overpass gyms */}
          {viewportGyms
            .filter(og => !dbGyms.some(g => g.name.toLowerCase() === og.tags.name?.toLowerCase()))
            .map(og => (
              <Marker key={`op-${og.id}`} position={[og.lat, og.lon]} icon={gymIcon}>
                <Popup>
                  <OverpassPopupContent og={og} currentUserId={currentUserId} onJoin={claimAndJoin} />
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* Locate me */}
        {userLoc && (
          <button onClick={() => setCenter([...userLoc as [number, number]])}
            className="absolute bottom-4 right-3 z-[1000] w-11 h-11 rounded-full flex items-center justify-center text-white shadow-xl"
            style={{ background: 'rgba(6,6,6,.85)', border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(12px)' }}>
            <span style={{ fontSize: 20 }}>📍</span>
          </button>
        )}
      </div>
    </div>
  )
}
