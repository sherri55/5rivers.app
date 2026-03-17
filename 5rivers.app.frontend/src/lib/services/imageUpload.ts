import { config } from '../config'
import { getStoredToken } from '@/features/auth'

export const uploadImage = async (file: File, folder: string = 'jobs'): Promise<string> => {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('folder', folder)

  const token = getStoredToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(config.api.uploadEndpoint, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = errorData.error || response.statusText
    if (response.status === 401) {
      throw new Error('Session expired. Please sign in again.')
    }
    throw new Error(`Upload failed: ${message}`)
  }

  const result = await response.json()
  return result.url
}

export const uploadMultipleImages = async (files: File[], folder: string = 'jobs'): Promise<string[]> => {
  const uploadPromises = files.map(file => uploadImage(file, folder))
  return Promise.all(uploadPromises)
}

// Utility function to validate image files
export const validateImageFile = (file: File, maxSizeMB: number = 5): string | null => {
  const isValidType = file.type.startsWith('image/')
  const isValidSize = file.size <= maxSizeMB * 1024 * 1024
  
  if (!isValidType) {
    return "Please upload only image files"
  }
  
  if (!isValidSize) {
    return `Please upload images smaller than ${maxSizeMB}MB`
  }
  
  return null // No error
}

// Utility function to create preview URL
export const createPreviewUrl = (file: File): string => {
  return URL.createObjectURL(file)
}

// Example implementation for AWS S3
/*
import AWS from 'aws-sdk'

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
})

export const uploadImage = async (file: File, folder: string = 'jobs'): Promise<string> => {
  const fileName = `${folder}/${Date.now()}_${file.name}`
  
  const params = {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: fileName,
    Body: file,
    ContentType: file.type,
    ACL: 'public-read'
  }
  
  const result = await s3.upload(params).promise()
  return result.Location
}
*/

// Example implementation for Cloudinary
/*
export const uploadImage = async (file: File, folder: string = 'jobs'): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET!)
  formData.append('folder', folder)
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData
    }
  )
  
  const data = await response.json()
  return data.secure_url
}
*/
