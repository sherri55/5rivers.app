import fs from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

export interface UploadResult {
  url: string
  path: string
  filename: string
}

export class UploadService {
  private uploadDir: string

  constructor() {
    // Create uploads directory in the backend public folder
    this.uploadDir = path.join(process.cwd(), 'uploads')
    this.ensureUploadDir()
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir)
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true })
    }
  }

  private generateFileName(originalName: string): string {
    const ext = path.extname(originalName)
    const name = path.basename(originalName, ext)
    const timestamp = Date.now()
    const random = randomBytes(8).toString('hex')
    return `${timestamp}_${random}_${name}${ext}`
  }

  async uploadImage(
    buffer: Buffer, 
    originalName: string, 
    folder: string = 'jobs'
  ): Promise<UploadResult> {
    // Create folder if it doesn't exist
    const folderPath = path.join(this.uploadDir, folder)
    try {
      await fs.access(folderPath)
    } catch {
      await fs.mkdir(folderPath, { recursive: true })
    }

    const fileName = this.generateFileName(originalName)
    const filePath = path.join(folderPath, fileName)
    
    await fs.writeFile(filePath, buffer)
    
    // Generate URL for serving the file
    const url = `/uploads/${folder}/${fileName}`
    
    return {
      url,
      path: filePath,
      filename: fileName
    }
  }

  async deleteImage(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.warn('Failed to delete file:', filePath, error)
    }
  }

  // Validate image file
  static validateImageFile(buffer: Buffer, filename: string): boolean {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const ext = path.extname(filename).toLowerCase()
    
    if (!allowedExtensions.includes(ext)) {
      return false
    }

    // Basic file signature check
    const signatures = {
      jpg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46],
      webp: [0x52, 0x49, 0x46, 0x46]
    }

    for (const [type, signature] of Object.entries(signatures)) {
      if (signature.every((byte, index) => buffer[index] === byte)) {
        return true
      }
    }

    return false
  }
}

export const uploadService = new UploadService()
