'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'
import { Gym } from '@/lib/types'

// Fix Leaflet icons in Next.js / webpack
// @ts-expect-error leaflet private prop
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const gymIcon = L.divIcon({
  html: '<div class="gym-marker-div" style="font-size:24px;line-height:1;cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,.8))">🏋️</div>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
})

const userIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;background:#4a9eff;border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(74,158,255,.8);"></div>',
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 13, { animate: true }) }, [lat, lng, map])
  return null
}

interface Props {
  currentUserId?: string
  userGymId?: number | null
}

export default function GymMap({ currentUserId, userGymId }: Props) {
  const [gyms, setGyms]           = useState<Gym[]>([])
  const [search, setSearch]       = useState('')
  const [userLoc, setUserLoc]     = useState<[number, number] | null>(null)
  const [center, setCenter]       = useState<[number, number]>([20, 0])
  const [zoom, setZoom]           = useState(2)
  const [memberOf, setMemberOf]   = useState<Set<number>>(new Set())
  const [joining, setJoining]     = useState<number | null>(null)

  useEffect(() => {
    supabase.from('gyms').select('*').then(({ data }) => setGyms((data as Gym[]) || []))

    if (currentUserId) {
      supabase.from('gym_members').select('gym_id').eq('user_id', currentUserId)
        .then(({ data }) => setMemberOf(new Set((data || []).map((r: { gym_id: number }) => r.gym_id))))
    }

    navigator.geolocation?.getCurrentPosition(
      pos => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserLoc(loc)
        setCenter(loc)
        setZoom(12)
      },
      () => {},
      { timeout: 8000 }
    )
  }, [currentUserId])

  const toggleMembership = async (gym: Gym) => {
    if (!currentUserId) return
    setJoining(gym.id)
    if (memberOf.has(gym.id)) {
      await supabase.from('gym_members').delete().eq('user_id', currentUserId).eq('gym_id', gym.id)
      setMemberOf(prev => { const s = new Set(prev); s.delete(gym.id); return s })
    } else {
      await supabase.from('gym_members').insert({ user_id: currentUserId, gym_id: gym.id })
      setMemberOf(prev => new Set([...prev, gym.id]))
    }
    setJoining(null)
  }

  const filtered = gyms.filter(g =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.city || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative h-svh pb-16">
      {/* Search bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        <input
          type="text"
          placeholder="🔍  Search gyms by name or city…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-bg-2/95 backdrop-blur-sm border border-bdr-2 rounded-2xl px-4 py-3 text-txt-1 text-sm placeholder:text-txt-3 outline-none focus:border-red-p transition-colors shadow-xl"
        />
      </div>

      {/* My location button */}
      {userLoc && (
        <button
          onClick={() => { setCenter(userLoc); setZoom(13) }}
          className="absolute bottom-20 right-4 z-[1000] bg-bg-2/95 border border-bdr-2 rounded-full w-11 h-11 flex items-center justify-center text-xl shadow-xl hover:bg-bg-3 transition-colors"
        >
          📍
        </button>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={true}
      >
        <RecenterMap lat={center[0]} lng={center[1]} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright" style="color:#848484">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" style="color:#848484">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {/* User location */}
        {userLoc && <Marker position={userLoc} icon={userIcon}><Popup>You are here</Popup></Marker>}

        {/* Gym markers */}
        {filtered.filter(g => g.lat && g.lng).map(gym => (
          <Marker key={gym.id} position={[gym.lat!, gym.lng!]} icon={gymIcon}>
            <Popup>
              <div className="p-3 min-w-[180px]">
                <p className="font-head font-bold text-txt-1 text-base mb-0.5">{gym.name}</p>
                {gym.city && <p className="text-txt-2 text-xs mb-1">{gym.city}{gym.country ? `, ${gym.country}` : ''}</p>}
                {gym.address && <p className="text-txt-3 text-xs mb-3">{gym.address}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-txt-3 text-xs">{gym.members_count} members</span>
                  {currentUserId && (
                    <button
                      onClick={() => toggleMembership(gym)}
                      disabled={joining === gym.id}
                      className={`text-xs font-head font-bold px-3 py-1 rounded-full transition-all ${
                        memberOf.has(gym.id)
                          ? 'bg-bdr-3 text-txt-2 hover:bg-red-p/20 hover:text-red-b'
                          : 'bg-red-p text-white hover:bg-red-b'
                      }`}
                    >
                      {memberOf.has(gym.id) ? 'Leave' : 'Join'}
                    </button>
                  )}
                </div>
                {userGymId === gym.id && (
                  <p className="text-red-b text-xs mt-1 font-head font-bold">⭐ My Gym</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
