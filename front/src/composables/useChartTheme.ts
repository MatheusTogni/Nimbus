import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'

/** Axis/grid/tooltip colors that follow the light/dark theme. */
export function useChartTheme() {
  const ui = useUiStore()
  return computed(() => {
    const dark = ui.isDark
    return {
      text: dark ? '#94a3b8' : '#64748b',
      grid: dark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)',
      surface: dark ? '#0f172a' : '#ffffff',
      tooltip: {
        backgroundColor: dark ? '#1e293b' : '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
        boxPadding: 4,
      },
    }
  })
}
