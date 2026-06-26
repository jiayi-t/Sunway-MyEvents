import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/header'
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
  const linksInitialized = useRef(false)
  const [linksSaved, setLinksSaved] = useState(false)
  // track which row is being dragged for drag-and-drop reordering
  const dragIndex = useRef<number | null>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  // track which row is being dragged for drag-and-drop reordering (for styling)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  // track the position of the dragged row for touch screens (for styling)
  const [touchGhost, setTouchGhost] = useState<{
    y: number; link: SocialLinks; left: number; width: number; height: number
  } | null>(null)

  useEffect(() => {
    if (profile?.social_links && !linksInitialized.current) {
      linksInitialized.current = true
      setLinks(profile.social_links)
    }
  }, [profile])

  const hasChanges = JSON.stringify(links) !== JSON.stringify(profile?.social_links ?? [])

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

  return (
    <div className="bg-surface">
      <Header />

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
                  {/* Dragged Row Ghost */}
                  {touchGhost && (
                    <div
                      style={{ position: 'fixed', top: touchGhost.y, left: touchGhost.left, width: touchGhost.width, zIndex: 50, pointerEvents: 'none' }}
                      className="flex items-center gap-2 bg-card shadow-xl ring-1 ring-primary/20 rounded-lg opacity-95"
                    >
                      <GripVertical className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-foreground flex-shrink-0">
                        <LinkTypeIcon type={touchGhost.link.type} className="w-4 h-4" />
                      </div>
                      <span className="flex-1 min-w-0 border border-border rounded-lg px-2 py-1.5 text-sm text-foreground truncate">
                        {touchGhost.link.url || 'https://'}
                      </span>
                      <div className="w-4 flex-shrink-0" />
                    </div>
                  )}
                  {/* Link Rows */}
                  {links.map((link, index) => (
                    <div
                      key={index}
                      // use ref to track the position of each row for drag-and-drop reordering
                      ref={el => { rowRefs.current[index] = el }}
                      draggable
                      onDragStart={() => { dragIndex.current = index; setDraggingIndex(index) }}
                      onDragOver={e => {
                        e.preventDefault()
                        if (dragIndex.current === null || dragIndex.current === index) return
                        reorderLinks(dragIndex.current, index)
                        dragIndex.current = index
                      }}
                      onDragEnd={() => { dragIndex.current = null; setDraggingIndex(null) }}
                      className={`flex items-center gap-2 rounded-lg transition-all ${
                        draggingIndex === index && touchGhost
                          ? 'opacity-0'
                          : draggingIndex === index
                          ? 'shadow-xl ring-1 ring-border bg-card scale-[1.03] z-10 relative px-1 -mx-1'
                          : draggingIndex !== null
                          ? 'opacity-40'
                          : ''
                      }`}
                    >
                      {/* Drag Handle */}
                      <GripVertical
                        className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0"
                        // stops the browser from scrolling when dragging on touch screens
                        style={{ touchAction: 'none' }}
                        onTouchStart={e => {
                          const touch = e.touches[0]
                          // get the position of the row being dragged to position the ghost element correctly
                          const rect = rowRefs.current[index]?.getBoundingClientRect()
                          dragIndex.current = index
                          setDraggingIndex(index)
                          if (rect) setTouchGhost({ y: touch.clientY - rect.height / 2, link: links[index], left: rect.left, width: rect.width, height: rect.height })
                        }}
                        onTouchMove={e => {
                          if (dragIndex.current === null) return
                          const touch = e.touches[0]
                          setTouchGhost(prev => prev ? { ...prev, y: touch.clientY - prev.height / 2 } : null)
                          const target = rowRefs.current.findIndex(el => {
                            if (!el) return false
                            const rect = el.getBoundingClientRect()
                            return touch.clientY >= rect.top && touch.clientY <= rect.bottom
                          })
                          if (target !== -1 && target !== dragIndex.current) {
                            reorderLinks(dragIndex.current, target)
                            dragIndex.current = target
                          }
                        }}
                        onTouchEnd={() => { dragIndex.current = null; setDraggingIndex(null); setTouchGhost(null) }}
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
                onClick={() => updateMutation.mutate({ social_links: links, about: profile?.about ?? null }, { onSuccess: () => setLinksSaved(true) })}
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
