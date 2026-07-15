import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/auth-context'
import { Plus, Trash2, Globe, Link, BookOpen, Mail, GripVertical, Pencil } from 'lucide-react'
import { InstagramLogo, LinkedinLogo, TiktokLogo, FacebookLogo } from 'phosphor-react'
import { useOrganizerProfileQuery, type SocialLinks } from '../../api/queries'
import { useUpdateOrganizerProfileMutation } from '../../api/mutations'
import { ProfileInfoSkeleton } from '../../components/skeletons'
import api from '../../services/api'

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

const CS_CATEGORIES = [
  'Accounting & Finance',
  'Art & Music',
  'Business',
  'Cultural',
  'General Interest',
  'Martial Art',
  'Nature',
  'Religious',
  'Sports',
  'Uniform/Affiliate',
]

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
  const { user, updateUser } = useAuth()

  const { data: profile, isLoading } = useOrganizerProfileQuery()
  const updateMutation = useUpdateOrganizerProfileMutation()

  const [name, setName] = useState('')
  const [sunwayId, setSunwayId] = useState('')
  const [email, setEmail] = useState('')
  const [orgType, setOrgType] = useState<'SLB' | 'CS'>('CS')
  const [subCategory, setSubCategory] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const [links, setLinks] = useState<SocialLinks[]>([])
  const [about, setAbout] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const profileInitialized = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoMenuRef = useRef<HTMLDivElement>(null)
  const linkDragStateRef = useRef<{ index: number; startY: number; targetIndex: number } | null>(null)
  const linkRowRefs = useRef<(HTMLDivElement | null)[]>([])
  const [linkActiveDrag, setLinkActiveDrag] = useState<{ index: number; deltaY: number; targetIndex: number } | null>(null)

  useEffect(() => {
    if (profile && !profileInitialized.current) {
      profileInitialized.current = true
      setName(profile.name ?? '')
      setSunwayId(profile.sunway_id ?? '')
      setEmail(profile.email ?? '')
      const isSLB = profile.category === 'SLB'
      setOrgType(isSLB ? 'SLB' : 'CS')
      setSubCategory(isSLB ? '' : (profile.category ?? ''))
      setImageUrl(profile.image_url ?? null)
      setLinks(profile.social_links ?? [])
      setAbout(profile.about ?? '')
    }
  }, [profile])

  const currentCategory = orgType === 'SLB' ? 'SLB' : (subCategory || null)

  const hasChanges =
    name !== (profile?.name ?? '') ||
    sunwayId !== (profile?.sunway_id ?? '') ||
    email !== (profile?.email ?? '') ||
    currentCategory !== (profile?.category ?? null) ||
    imageUrl !== (profile?.image_url ?? null) ||
    JSON.stringify(links) !== JSON.stringify(profile?.social_links ?? []) ||
    about !== (profile?.about ?? '')

  useEffect(() => { if (hasChanges) setSaved(false) }, [hasChanges])

  useEffect(() => {
    if (!showPhotoMenu) return
    const handler = (e: MouseEvent) => {
      if (!photoMenuRef.current?.contains(e.target as Node)) setShowPhotoMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPhotoMenu])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      // uploads the image to the server as multipart/form-data to POST /uploads endpoint which returns the URL of the uploaded image
      const res = await api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImageUrl(res.data.url)
    } finally {
      setImageUploading(false)
      e.target.value = ''
    }
  }

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

  const handleSave = () => {
    if (!name.trim()) { setSaveError('Organisation name cannot be blank'); return }
    setSaveError('')
    updateMutation.mutate(
      {
        name,
        sunway_id: sunwayId,
        email,
        category: currentCategory,
        image_url: imageUrl,
        social_links: links,
        about: about || null,
      },
      {
        onSuccess: (data: any) => {
          setSaved(true)
          updateUser({ name: data.name, sunway_id: data.sunway_id, image_url: data.image_url })
        },
        onError: (err: any) => setSaveError(err.response?.data?.error || 'Failed to save'),
      }
    )
  }

  const avatarSrc = imageUrl
    ? (imageUrl.startsWith('/uploads/') ? `http://localhost:3001${imageUrl}` : imageUrl)
    : (user?.image_url ?? '/Default Icon.jpg')

  return (
    <div className="bg-surface">

      {/* Sub-header */}
      <div className="bg-primary px-4 py-3 flex items-center">
        <h1 className="text-white font-bold text-base flex-1 text-center">Profile</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <ProfileInfoSkeleton rows={6} />
        ) : (
          <>
            {/* Avatar */}
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-16 h-16 mb-2">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-surface">
                  <img
                    src={avatarSrc}
                    alt={user?.name ?? ''}
                    className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.src = '/Default Icon.jpg' }}
                  />
                  {imageUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div ref={photoMenuRef} className="absolute bottom-0 right-0">
                  <button

                    onClick={() => setShowPhotoMenu(m => !m)}
                    disabled={imageUploading}
                    className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow"
                  >
                    <Pencil className="w-3 h-3 text-white" />
                  </button>
                  {showPhotoMenu && (
                    <div className="absolute left-full ml-1 bottom-0 bg-white rounded-lg shadow-lg border border-border text-sm overflow-hidden z-10 w-36">
                      <button
    
                        onClick={() => { setShowPhotoMenu(false); fileInputRef.current?.click() }}
                        className="w-full text-left px-3 py-2 hover:bg-surface text-foreground"
                      >
                        Upload photo
                      </button>
                      {imageUrl && (
                        <button
      
                          onClick={() => { setShowPhotoMenu(false); setImageUrl(null) }}
                          className="w-full text-left px-3 py-2 hover:bg-surface text-red-500"
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleImageChange}
              />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Organisation name"
                className="text-primary font-bold text-lg text-center bg-transparent border-b border-border focus:outline-none focus:border-primary w-full max-w-xs"
              />
            </div>

            <div className="bg-card rounded-xl shadow">
              {/* Username */}
              <div className="flex items-center border-b border-border rounded-t-xl">
                <span className="w-36 pl-4 pr-1 py-3 text-sm font-semibold text-foreground flex-shrink-0">Username</span>
                <div className="pl-1 pr-4 py-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={sunwayId}
                    onChange={e => setSunwayId(e.target.value)}
                    placeholder="3 - 8 characters"
                    maxLength={8}
                    className="w-full border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center border-b border-border">
                <span className="w-36 pl-4 pr-1 py-3 text-sm font-semibold text-foreground flex-shrink-0">Email</span>
                <div className="pl-1 pr-4 py-2 flex-1 min-w-0">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="flex items-center border-b border-border">
                <span className="w-36 pl-4 pr-1 py-3 text-sm font-semibold text-foreground flex-shrink-0">Category</span>
                <div className="pl-1 pr-4 py-2 flex-1 min-w-0">
                  <select
                    value={orgType}
                    onChange={e => { setOrgType(e.target.value as 'SLB' | 'CS'); if (e.target.value === 'SLB') setSubCategory('') }}
                    className="w-full border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary bg-white"
                  >
                    <option value="SLB">SLB</option>
                    <option value="CS">C&S</option>
                  </select>
                </div>
              </div>

              {/* Sub-category (only for C&S) */}
              {orgType === 'CS' && (
                <div className="flex items-center border-b border-border">
                  <span className="w-36 pl-4 pr-1 py-3 text-sm font-semibold text-foreground flex-shrink-0">Sub-category</span>
                  <div className="pl-1 pr-4 py-2 flex-1 min-w-0">
                    <select
                      value={subCategory}
                      onChange={e => setSubCategory(e.target.value)}
                      className="w-full border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary bg-white"
                    >
                      <option value="">Select sub-category</option>
                      {CS_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

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

            {saveError && <p className="text-red-500 text-sm">{saveError}</p>}

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={!hasChanges || updateMutation.isPending || imageUploading}
                className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? 'Saving...' : saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
