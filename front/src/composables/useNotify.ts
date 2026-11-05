import { useI18n } from 'vue-i18n'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { formatTime } from '@/utils/format'

/** Translates API errors (by code) and shows toasts. */
export function useNotify() {
  const { t, te } = useI18n()
  const ui = useUiStore()
  const auth = useAuthStore()

  function errorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
        return `${t('errors.VALIDATION_ERROR')} ${(error.details as string[]).join('; ')}`
      }
      const key = `errors.${error.code}`
      if (te(key)) {
        const time = auth.demoInfo ? formatTime(auth.demoInfo.nextResetAt) : '03:00'
        return t(key, { time })
      }
      return error.message
    }
    if (error instanceof TypeError) return t('errors.NETWORK')
    return t('errors.UNKNOWN')
  }

  return {
    success: (message: string) => ui.toast(message, 'success'),
    info: (message: string) => ui.toast(message, 'info'),
    error: (error: unknown) => ui.toast(errorMessage(error), 'error', 7000),
    errorMessage,
  }
}
