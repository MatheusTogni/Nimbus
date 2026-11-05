import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RiskMatrix from '@/components/risk/RiskMatrix.vue'
import { i18n } from '@/i18n'

const mountMatrix = (props: Record<string, unknown>) =>
  mount(RiskMatrix, { props, global: { plugins: [i18n] } })

describe('RiskMatrix', () => {
  it('renders 25 cells with counts placed by impact (rows) and probability (columns)', () => {
    const counts = Array.from({ length: 5 }, () => Array<number>(5).fill(0))
    counts[4]![3] = 7 // impact 5, probability 4
    const wrapper = mountMatrix({ counts })

    const cells = wrapper.findAll('[aria-label*="×"]')
    expect(cells).toHaveLength(25)
    // First row is impact 5; fourth column is probability 4.
    expect(cells[3]!.text()).toBe('7')
    expect(cells[3]!.attributes('aria-label')).toContain('= 20')
  })

  it('emits the clicked cell when interactive', async () => {
    const wrapper = mountMatrix({ interactive: true })
    const cells = wrapper.findAll('button')
    await cells[24]!.trigger('click') // last row (impact 1), last column (probability 5)
    expect(wrapper.emitted('select')).toEqual([[5, 1]])
  })

  it('does not render buttons when read-only', () => {
    expect(mountMatrix({}).findAll('button')).toHaveLength(0)
  })

  it('shows inherent and residual markers', () => {
    const wrapper = mountMatrix({
      markers: [
        { p: 4, i: 5, label: 'I', kind: 'inherent' },
        { p: 2, i: 3, label: 'R', kind: 'residual' },
      ],
    })
    expect(wrapper.text()).toContain('I')
    expect(wrapper.text()).toContain('R')
  })
})
