import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { errMsg } from '@/lib/api'
import { mediaUrl, uploadImage } from '@/lib/media'
import { Button } from '@/components/ui'
import { useT } from '@/i18n/useT'

type Props = {
  value?: string | null
  onChange: (url: string | null) => void
  entity?: string
  label?: string
}

export default function ImageUpload({ value, onChange, entity = 'products', label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const t = useT()
  const preview = mediaUrl(value)

  async function onFile(file?: File | null) {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const res = await uploadImage(file, entity)
      onChange(res.url)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</div>
      <div className="flex items-start gap-4">
        <div className="relative h-28 w-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="text-slate-400" size={28} />
          )}
          {loading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-black/50 flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={22} />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => inputRef.current?.click()}>
            {preview ? t('imageUpload.changeImage') : t('imageUpload.uploadImage')}
          </Button>
          {preview && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
              <X size={14} /> {t('imageUpload.remove')}
            </Button>
          )}
          <p className="text-xs font-medium text-slate-500 max-w-[220px]">
            {t('imageUpload.hint')}
          </p>
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
