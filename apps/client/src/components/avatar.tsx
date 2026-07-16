import { useState, useEffect } from 'react'
import { User } from 'lucide-react'

// shown when there is no image or the image fails to load
export default function Avatar({ src, alt, className }: {
  src?: string | null
  alt: string
  className: string  
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className={`${className} rounded-full object-cover`}
      />
    )
  }
  return (
    <div className={`${className} rounded-full bg-gray-100 flex items-end justify-center overflow-hidden`}>
      <User className="w-[90%] h-[90%] translate-y-[12%] text-gray-500" aria-hidden="true" />
    </div>
  )
}
