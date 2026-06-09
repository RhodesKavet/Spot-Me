'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'
import { Gym, Profile } from '@/lib/types'

// @ts-expect-error leaflet private
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const gymIcon = L.divIcon({
  html: '<div class="gym-marker-div" style="font-size:26px;line-height:1;text-align:center">🏋️</div>',
  iconSize: [32, 32], iconAnchor: [16, 28], popupAnchor: [0, -30], className: '',
})
const userIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2.5px solid #fff;box-shadow:0 0 8px rgba(59,130,246,.7)"></div>',
  iconSize: [14, 14], iconAnchor: [7, 7], className: '',
})

interface OverpassGym { id: number; lat: number; lon: number; tags: Record<string, string> }

interface Props {
  currentUserId?: string
  userGymId?: number | null
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], map.getZoom(), { animate: true }) }, [lat, lng, map])
  return null
}

export default function GymMap({ currentUserId, userGymId }: Props) {
  const [dbGyms, setDbGyms]             = useState<Gym[]>([])
  const [overpassGyms, setOverpassGyms] = useState<OverpassGym[]>([])
  const [memberships, setMemberships]   = useState<Set<number>>(new Set())
  const [userLoc, setUserLoc]           = useState<[number, number] | null>(null)
  const [center, setCenter]             = useState<[number, number]>([20, 0])
  const [zoom, setZoom]                 = useState(2)
  const [searchText, setSearchText]     = useState('')
  const [searching, setSearching]       = useState(false)
  const [searchError, setSearchError]   = useState('')
  const [resultMsg, setResultMsg]       = useState('')

  useEffect(() => {
    supabase.from('gyms').select('*').then(({ data }) => setDbGyms((data as Gym[]) || []))
    if (currentUserId) {
      supabase.from('gym_members').select('gym_id').eq('user_id', currentUserId)
        .then(({ data }) => setMemberships(new Set((data || []).map((r: any) => r.gym_id as number))))
    }
    navigator.geolocation?.getCurrentPosition(pos => {
      const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]
      setUserLoc(loc); setCenter(loc); setZoom(13)
    }, undefined, { enableHighAccuracy: true, timeout: 8000 })
  }, [currentUserId])

  const searchGyms = async () => {
    const q = searchText.trim()
    if (!q) return
    setSearching(true); setSearchError(''); setResultMsg(''); setOverpassGyms([])

    try {
      // Geocode with Nominatim
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'SpotMe-App/1.0 kavetr22@campbellhall.org' } }
      )
      const geoData = await geoRes.json()
      if (!geoData.length) { setSearchError('Location not found. Try a different city or address.'); return }

      const { lat, lon, display_name } = geoData[0]
      const clat = parseFloat(lat), clon = parseFloat(lon)
      const radius = 5000

      // Overpass API query for fitness centers
      const oq = `[out:json][timeout:25];(node["leisure"="fitness_centre"](around:${radius},${clat},${clon});way["leisure"="fitness_centre"](around:${radius},${clat},${clon});node["amenity"="gym"](around:${radius},${clat},${clon});way["amenity"="gym"](around:${radius},${clat},${clon});node["sport"="fitness"](around:${radius},${clat},${clon}););out center;`
      const opRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(oq),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      const opData = await opRes.json()

      const gyms: OverpassGym[] = (opData.elements || [])
        .filter((el: any) => (el.lat || el.center?.lat) && el.tags?.name)
        .map((el: any) => ({
          id: el.id,
          lat: el.lat || el.center.lat,
          lon: el.lon || el.center.lon,
          tags: el.tags || {},
        }))

      setOverpassGyms(gyms)
      setCenter([clat, clon]); setZoom(14)

      const city = display_name.split(',')[0]
      if (gyms.length === 0) setSearchError(`No gyms found near "${city}".`)
      else setResultMsg(`${gyms.length} gym${gyms.length > 1 ? 's' : ''} near ${city}`)
    } catch {
      setSearchError('Search failed — check your connection and try again.')
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

  // Upsert an Overpass gym into DB then join it
  const claimOverpassGym = async (og: OverpassGym) => {
    if (!currentUserId) return
    const name    = og.tags.name
    const address = [og.tags['addr:street'], og.tags['addr:city']].filter(Boolean).join(', ')
    // Check if it already exists (rough name match)
    let { data: existing } = await supabase.from('gyms').select('*').ilike('name', name).limit(1).maybeSingle()
    if (!existing) {
      const { data: created } = await supabase.from('gyms')
        .insert({ name, address: address || null, lat: og.lat, lng: og.lon })
        .select().single()
      existing = created
    }
    if (existing) toggleMembership(existing as Gym)
  }

  return (
    <div className="relative h-svh pb-16 flex flex-col">
      {/* Search bar */}
      <div className="px-3 py-2 glass border-b border-bdr-1 z-[1001] flex-shrink-0">
        <div className="flex gap-2">
          <input type="text" placeholder="Search city or gym…"
            value={searchText} onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchGyms()}
            className="input-dark py-2.5 text-sm flex-1" />
          <button onClick={searchGyms} disabled={searching}
            className="px-4 rounded-xl bg-gradient-to-r from-red-p to-red-b text-white font-head font-bold text-sm disabled:opacity-50 flex-shrink-0">
            {searching ? '⏳' : '🔍'}
          </button>
        </div>
        {searchError  && <p className="text-red-b text-xs mt-1.5 px-1">{searchError}</p>}
        {resultMsg    && <p className="text-txt-3 text-xs mt-1.5 px-1">{resultMsg} — tap a pin to join</p>}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}
          className="z-0" zoomControl>
          <RecenterMap lat={center[0]} lng={center[1]} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            maxZoom={19}
          />

          {userLoc && <Marker position={userLoc} icon={userIcon}><Popup>📍 You are here</Popup></Marker>}

          {/* DB gyms */}
          {dbGyms.filter(g => g.lat && g.lng).map(gym => (
            <Marker key={`db-${gym.id}`} position={[gym.lat!, gym.lng!]} icon={gymIcon}>
              <Popup>
                <div className="p-3 min-w-[180px]">
                  <p className="font-head font-bold text-txt-1 text-sm mb-0.5">{gym.name}</p>
                  {gym.address && <p className="text-txt-3 text-xs mb-3">{gym.address}</p>}
                  {userGymId === gym.id && <p className="text-red-b text-xs mb-2 font-head font-bold">⭐ My Gym</p>}
                  {currentUserId && (
                    <button onClick={() => toggleMembership(gym)}
                      className={`w-full py-2 rounded-xl text-xs font-head font-bold uppercase tracking-wider transition-all ${
                        memberships.has(gym.id)
                          ? 'bg-red-p/20 border border-red-p/40 text-red-b'
                          : 'bg-gradient-to-r from-red-p to-red-b text-white'
                      }`}>
                      {memberships.has(gym.id) ? 'Leave Gym' : 'Join Gym'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Overpass results */}
          {overpassGyms.map(og => (
            <Marker key={`op-${og.id}`} position={[og.lat, og.lon]} icon={gymIcon}>
              <Popup>
                <div className="p-3 min-w-[180px]">
                  <p className="font-head font-bold text-txt-1 text-sm mb-0.5">{og.tags.name}</p>
                  {(og.tags['addr:street'] || og.tags['addr:city']) && (
                    <p className="text-txt-3 text-xs mb-1">
                      {[og.tags['addr:street'], og.tags['addr:city']].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {og.tags['opening_hours'] && (
                    <p className="text-txt-3 text-xs mb-2">🕐 {og.tags['opening_hours']}</p>
                  )}
                  {currentUserId && (
                    <button onClick={() => claimOverpassGym(og)}
                      className="w-full py-2 rounded-xl text-xs font-head font-bold uppercase tracking-wider bg-gradient-to-r from-red-p to-red-b text-white">
                      Join Gym
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Locate me */}
        {userLoc && (
          <button onClick={() => setCenter([...userLoc])}
            className="absolute bottom-4 right-3 z-[1000] glass border border-bdr-1 rounded-full w-11 h-11 flex items-center justify-center text-xl shadow-xl">
            📍
          </button>
        )}
      </div>
    </div>
  )
}
