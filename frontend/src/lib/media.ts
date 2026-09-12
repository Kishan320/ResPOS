import { api } from '@/lib/api'

/** Resolve relative /media paths and absolute URLs for display */
export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path
  if (path.startsWith('/media/')) return path
  if (path.startsWith('media/')) return `/${path}`
  if (path.startsWith('/')) return path
  return `/media/${path}`
}

export async function uploadImage(file: File, entity = 'products'): Promise<{ url: string; path: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('entity', entity)
  const { data } = await api.post('/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return { url: data.url as string, path: data.path as string }
}
