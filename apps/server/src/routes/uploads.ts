import { Router, type Request, type Response } from 'express'
import multer, { type StorageEngine } from 'multer'
import path from 'path'
import fs from 'fs'

const router = Router()

const uploadDir = path.join(__dirname, '..', '..', 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage: StorageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, name)
  }
})

const upload = multer({ storage })

router.post('/', upload.single('file'), (req: Request, res: Response) => {
  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const url = `/uploads/${file.filename}`
  return res.json({ url })
})

export default router