import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { useEventQuery, useEventParticipantsQuery } from '../../api/queries'
import { useCheckinMutation } from '../../api/mutations'
import { Users, TicketCheck, XCircle } from 'lucide-react'

interface OrganizerEvent {
  id: number
  name: string
  capacity: number
}

interface Participant {
  id: number
  checked_in_at: string | null
}

type ScanStatus = { type: 'success'; name: string; identifier: string } | { type: 'error'; message: string } | null

export default function OrganizerCheckinScannerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lastScannedRef = useRef<string>('')
  const cooldownRef = useRef(false)
  const [cameraError, setCameraError] = useState(false)
  const [scanStatus, setScanStatus] = useState<ScanStatus>(null)

  const { data: eventData } = useEventQuery(id)
  const event = eventData as OrganizerEvent | undefined
  const { data: participantsData } = useEventParticipantsQuery(id)
  const participants = (participantsData || []) as Participant[]
  const checkedInCount = participants.filter(p => p.checked_in_at).length

  const checkinMutation = useCheckinMutation(id)

  useEffect(() => {
    const qr = new Html5Qrcode('qr-region')

    qr.start(
      // requests the back camera on mobile
      { facingMode: 'environment' },
      { fps: 10, qrbox: (w, h) => ({ width: Math.round(w * 0.85), height: Math.round(h * 0.85) }) },
      (decodedText) => {
        if (cooldownRef.current || decodedText === lastScannedRef.current) return
        lastScannedRef.current = decodedText
        cooldownRef.current = true

        checkinMutation.mutate(decodedText, {
          onSuccess: (data: { student_name: string; sunway_id: string; email: string; role: string }) => {
            const identifier = data.role === 'public' ? data.email : data.sunway_id
            setScanStatus({ type: 'success', name: data.student_name, identifier })
          },
          onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Scan failed'
            setScanStatus({ type: 'error', message: msg })
          },
          onSettled: () => {
            setTimeout(() => {
              setScanStatus(null)
              lastScannedRef.current = ''
              cooldownRef.current = false
            }, 2500)
          }
        })
      },
      () => {}
    ).catch(() => setCameraError(true))

    return () => {
      // synchronously wipe the div so the next mount starts on a clean DOM
      // do not call qr.clear() after stop(), it would run async and nuke the new scanner's elements
      const region = document.getElementById('qr-region')
      if (region) region.innerHTML = ''

      const state = qr.getState()
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        qr.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="bg-surface">

      {/* Sub-header */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Check In</h1>
      </div>

      {/* Camera viewfinder */}
      <div className="relative">
        {/* force the library's inline-styled video to fill the square crop box */}
        <style>{`
          #qr-region { height: 100% !important; }
          #qr-region video { height: 100% !important; object-fit: cover !important; }
        `}</style>
        {cameraError ? (
          <div className="flex items-center justify-center bg-black" style={{ aspectRatio: '1 / 1' }}>
            <p className="text-white text-sm text-center px-4">
              Camera access denied. Please allow camera permissions and reload.
            </p>
          </div>
        ) : (
          <div className="w-full relative overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
            <div id="qr-region" className="absolute inset-0" />
          </div>
        )}

        {/* Scan result overlay */}
        {scanStatus && (
          <div className={`absolute inset-x-0 bottom-0 px-4 py-3 flex items-center gap-3 ${
            scanStatus.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {scanStatus.type === 'success' ? (
              <>
                <TicketCheck className="w-5 h-5 text-white flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-semibold">{scanStatus.name}</p>
                  <p className="text-white/80 text-xs">{scanStatus.identifier} - Checked In</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-white flex-shrink-0" />
                <p className="text-white text-sm font-semibold">{scanStatus.message}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Event info + View Participants */}
      <div className="bg-card px-4 py-5">
        <p className="text-foreground font-bold text-lg leading-snug mb-2">
          {event?.name ?? '...'}
        </p>
        <p className="text-accent font-bold text-xl mb-4">
          {checkedInCount} / {event?.capacity || participants.length} Checked In
        </p>
        <button
          onClick={() => navigate(`/organizer/events/${id}/participants`)}
          className="w-full flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-full text-sm font-semibold cursor-pointer"
        >
          <Users className="w-4 h-4" />
          View Participants
        </button>

        <p className="mt-4 text-xs text-muted-foreground text-center px-2">
          Scan the participant's QR code to check them in, or tap View Participants to search for their name and check them in manually.
        </p>
      </div>
    </div>
  )
}