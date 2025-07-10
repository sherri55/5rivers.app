// Image upload service
// This includes both mock implementation and backend endpoint support

export const uploadImage = async (file: File, folder: string = 'jobs'): Promise<string> => {
  // Try to use the backend upload endpoint first
  try {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('folder', folder)
    
    // Use the upload server port (GraphQL port + 1)
    const uploadUrl = `http://localhost:4001/api/upload`
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed: ${response.statusText} - ${errorText}`)
    }
    
    const result = await response.json()
    return result.url
  } catch (error) {
    console.warn('Backend upload failed, falling back to mock:', error)
    
    // Mock implementation for development/demo
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
    
    // Generate a mock URL that points to localhost
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || 'jpg'
    const mockUrl = `http://localhost:4001/uploads/${folder}/${timestamp}_${randomId}.${extension}`
    
    return mockUrl
  }
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
