import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { authenticate } from '../middleware/auth'

const router = Router()

// when Supabase is configured (UAT/prod), files go to a public Storage bucket, otherwise (local dev) they are written to apps/server/uploads and served by express.static
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads'

const uploadDir = path.join(__dirname, '..', '..', 'uploads')
if (!supabase && !fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// max upload size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// only JPG and PNG images are accepted
const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowedExts = ALLOWED_TYPES[file.mimetype]
    const ext = path.extname(file.originalname).toLowerCase()
    if (!allowedExts || !allowedExts.includes(ext)) {
      return cb(new Error('Only JPG and PNG images are allowed'))
    }
    cb(null, true)
  }
})
// authenticate middleware is applied to ensure only logged-in users can upload files
router.post('/', authenticate, (req: Request, res: Response) => {
  upload.single('file')(req, res, async (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image must be 5MB or smaller' })
    }
    if (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' })
    }

    const file = req.file
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // derive the extension from the validated MIME type, never from the client-supplied filename
    const ext = file.mimetype === 'image/png' ? '.png' : '.jpg'
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`

    if (supabase) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(name, file.buffer, { contentType: file.mimetype })
      if (error) {
        console.error('Supabase upload failed:', error.message)
        return res.status(500).json({ error: 'Upload failed' })
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(name)
      return res.json({ url: data.publicUrl })
    }

    fs.writeFileSync(path.join(uploadDir, name), file.buffer)
    return res.json({ url: `/uploads/${name}` })
  })
})

export default router