import { Router, type Request, type Response } from 'express'
import multer, { type StorageEngine } from 'multer'
import path from 'path'
import fs from 'fs'
import { authenticate } from '../middleware/auth'

const router = Router()

const uploadDir = path.join(__dirname, '..', '..', 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// max upload size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024 

// only JPG and PNG images are accepted
const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
}

const storage: StorageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // derive the extension from the validated MIME type, never from the client-supplied filename
    const ext = file.mimetype === 'image/png' ? '.png' : '.jpg'
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, name)
  }
})

const upload = multer({
  storage,
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
  upload.single('file')(req, res, (err: unknown) => {
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

    const url = `/uploads/${file.filename}`
    return res.json({ url })
  })
})

export default router