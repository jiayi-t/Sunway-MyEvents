import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { ArrowLeft, Plus, Trash2, Globe, Link, BookOpen, Mail, GripVertical } from 'lucide-react'
import { InstagramLogo, LinkedinLogo, TiktokLogo, FacebookLogo } from 'phosphor-react'
import { useOrganizerProfileQuery, type SocialLinks } from '../../api/queries'
import { useUpdateOrganizerProfileMutation } from '../../api/mutations'

const LINK_TYPES: SocialLinks['type'][] = ['instagram', 'website', 'linkedin', 'tiktok', 'rednote', 'facebook', 'others']

const LINK_LABELS: Record<SocialLinks['type'], string> = {
  instagram: 'Instagram',
  website: 'Website',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  rednote: 'RedNote',
  facebook: 'Facebook',
  others: 'Others',
}

function LinkTypeIcon({ type, className }: { type: SocialLinks['type']; className?: string }) {
  if (type === 'instagram') return <InstagramLogo className={className} />
  if (type === 'website') return <Globe className={className} />
  if (type === 'linkedin') return <LinkedinLogo className={className} />
  if (type === 'tiktok') return <TiktokLogo className={className} />
  if (type === 'rednote') return <BookOpen className={className} />
  if (type === 'facebook') return <FacebookLogo className={className} />
  return <Link className={className} />
}

function LinkTypePicker({ value, onChange }: { value: SocialLinks['type']; onChange: (type: SocialLinks['type']) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-foreground hover:border-primary"
        title={LINK_LABELS[value]}
      >
        <LinkTypeIcon type={value} className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-10 py-1 min-w-max">
          {LINK_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => { onChange(type); setOpen(false) }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-surface ${value === type ? 'text-primary font-medium' : 'text-foreground'}`}
            >
              <LinkTypeIcon type={type} className="w-4 h-4 flex-shrink-0" />
              {LINK_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrganizerEditProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: profile, isLoading } = useOrganizerProfileQuery()
  const updateMutation = useUpdateOrganizerProfileMutation()

  const [links, setLinks] = useState<SocialLinks[]>([])
  const [about, setAbout] = useState('')
  const profileInitialized = useRef(false)
  const [linksSaved, setLinksSaved] = useState(false)
  const linkDragStateRef = useRef<{ index: number; startY: number; targetIndex: number } | null>(null)
  const linkRowRefs = useRef<(HTMLDivElement | null)[]>([])
  const [linkActiveDrag, setLinkActiveDrag] = useState<{ index: number; deltaY: number; targetIndex: number } | null>(null)

  useEffect(() => {
    if (profile && !profileInitialized.current) {
      profileInitialized.current = true
      setLinks(profile.social_links ?? [])
      setAbout(profile.about ?? '')
    }
  }, [profile])

  const hasChanges =
    JSON.stringify(links) !== JSON.stringify(profile?.social_links ?? []) ||
    about !== (profile?.about ?? '')

  useEffect(() => { if (hasChanges) setLinksSaved(false) }, [hasChanges])

  const addLink = () => setLinks(prev => [...prev, { type: 'instagram', url: '' }])

  const removeLink = (index: number) =>
    setLinks(prev => prev.filter((_, i) => i !== index))

  const updateLink = (index: number, field: keyof SocialLinks, value: string) =>
    setLinks(prev => prev.map((link, i) =>
      i === index ? { ...link, [field]: value } : link
    ))

  const reorderLinks = (from: number, to: number) =>
    setLinks(prev => {
      const next = [...prev]
      // removes the dragged item and inserts it at the new position
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })

  const getLinkTransformY = (i: number): number => {
    if (!linkActiveDrag) return 0
    const { index: dragIdx, deltaY, targetIndex } = linkActiveDrag
    if (i === dragIdx) return deltaY
    const gap = 8
    const draggedHeight = (linkRowRefs.current[dragIdx]?.offsetHeight ?? 0) + gap
    if (dragIdx < targetIndex && i > dragIdx && i <= targetIndex) return -draggedHeight
    if (dragIdx > targetIndex && i >= targetIndex && i < dragIdx) return draggedHeight
    return 0
  }

  return (
    <div className="bg-surface">

      {/* Sub-header */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft />
        </button>
        <h1 className="text-white font-bold text-base flex-1 text-center">Profile</h1>
        <div className="w-5" />
      </div>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground text-sm text-center mt-8">Loading...</p>
        ) : (
          <>
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-surface mb-2">
                <img
                  src={user?.image_url ?? '/Default Icon.jpg'}
                  alt={user?.name ?? ''}
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.src = '/Default Icon.jpg' }}
                />
              </div>
              <p className="text-primary font-bold text-lg">{user?.name}</p>
            </div>

            <div className="bg-card rounded-xl shadow">
              {[
                { label: 'Username', value: profile?.sunway_id },
                { label: 'Email', value: profile?.email },
                { label: 'Category', value: profile?.category === 'SLB' ? 'SLB' : profile?.category ? 'C&S' : null },
                { label: 'Sub-category', value: profile?.category === 'SLB' ? 'N/A' : profile?.category ?? null },
              ].map(({ label, value }, index) => (
                <div key={label} className={`flex border-b border-border ${index === 0 ? 'rounded-t-xl' : ''}`}>
                  <span className="w-36 pl-4 pr-1 py-3 text-sm font-semibold text-foreground flex-shrink-0">{label}</span>
                  <span className="pl-1 pr-4 py-3 text-sm text-foreground">{value ?? '—'}</span>
                </div>
              ))}

              {/* About */}
              <div className="flex border-b border-border">
                <span className="w-36 pl-4 pr-1 py-3 text-sm font-semibold text-foreground flex-shrink-0">About</span>
                <div className="pl-1 pr-4 py-3 flex-1 min-w-0">
                  <textarea
                    value={about}
                    onChange={e => setAbout(e.target.value)}
                    placeholder="Tell students about your organisation..."
                    rows={3}
                    className="w-full border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              {/* Links */}
              <div className="flex rounded-b-xl overflow-visible">
                <span className="w-36 pl-4 pr-1 py-3 text-sm font-semibold text-foreground flex-shrink-0">Links</span>
                <div className="pl-1 pr-4 py-3 flex-1 min-w-0 space-y-2">
                  {/* Email */}
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-muted-foreground flex-shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="flex-1 min-w-0 border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground bg-surface truncate">
                      {profile?.email}
                    </span>
                  </div>
                  {/* Link Rows */}
                  {links.map((link, index) => (
                    <div
                      key={index}
                      // use ref to track the position of each row for drag-and-drop reordering
                      ref={el => { linkRowRefs.current[index] = el }}
                      style={{
                        transform: getLinkTransformY(index) !== 0 ? `translateY(${getLinkTransformY(index)}px)` : undefined,
                        position: 'relative',
                        zIndex: linkActiveDrag?.index === index ? 10 : 0,
                      }}
                      className={`flex items-center gap-2 rounded-lg ${linkActiveDrag?.index === index ? 'opacity-50' : linkActiveDrag ? 'transition-transform duration-200' : ''}`}
                    >
                      {/* Drag Handle */}
                      <GripVertical
                        className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0"
                        // stops the browser from scrolling when dragging on touch screens
                        style={{ touchAction: 'none' }}
                        onPointerDown={e => {
                          e.preventDefault()
                          e.currentTarget.setPointerCapture(e.pointerId)
                          linkDragStateRef.current = { index, startY: e.clientY, targetIndex: index }
                          setLinkActiveDrag({ index, deltaY: 0, targetIndex: index })
                        }}
                        onPointerMove={e => {
                          if (!linkDragStateRef.current || linkDragStateRef.current.index !== index) return
                          const deltaY = e.clientY - linkDragStateRef.current.startY
                          let newTarget = index
                          for (let i = 0; i < linkRowRefs.current.length; i++) {
                            if (i === index) continue
                            const el = linkRowRefs.current[i]
                            if (!el) continue
                            const rect = el.getBoundingClientRect()
                            const mid = rect.top + rect.height / 2
                            if (i < index && e.clientY < mid) { newTarget = i; break }
                            if (i > index && e.clientY > mid) newTarget = i
                          }
                          linkDragStateRef.current.targetIndex = newTarget
                          setLinkActiveDrag({ index, deltaY, targetIndex: newTarget })
                        }}
                        onPointerUp={() => {
                          if (!linkDragStateRef.current) return
                          const { index: from, targetIndex: to } = linkDragStateRef.current
                          linkDragStateRef.current = null
                          if (to !== from) reorderLinks(from, to)
                          setLinkActiveDrag(null)
                        }}
                      />
                      <LinkTypePicker
                        value={link.type}
                        onChange={type => updateLink(index, 'type', type)}
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={e => updateLink(index, 'url', e.target.value)}
                        placeholder="https://"
                        className="flex-1 min-w-0 border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
                      />
                      <button onClick={() => removeLink(index)} className="text-muted-foreground hover:text-red-500 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addLink} className="flex items-center gap-1 text-sm text-primary font-medium">
                    <Plus className="w-4 h-4" />
                    Add link
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => updateMutation.mutate({ social_links: links, about: about || null }, { onSuccess: () => setLinksSaved(true) })}
                disabled={!hasChanges || updateMutation.isPending}
                className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? 'Saving...' : linksSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
