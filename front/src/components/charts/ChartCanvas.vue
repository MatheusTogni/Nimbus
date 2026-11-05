<script setup lang="ts">
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartData,
  type ChartOptions,
  type ChartType,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
)
Chart.defaults.font.family = "'Inter', ui-sans-serif, system-ui, sans-serif"

const props = defineProps<{
  type: ChartType
  data: ChartData
  options?: ChartOptions
  label: string
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const chart = shallowRef<Chart | null>(null)

function render() {
  chart.value?.destroy()
  if (!canvas.value) return
  chart.value = new Chart(canvas.value, {
    type: props.type,
    data: props.data,
    options: { responsive: true, maintainAspectRatio: false, ...props.options },
  })
}

onMounted(render)
// Re-render on data/theme/locale changes (the parent recomputes data and options).
watch(() => [props.data, props.options], render)
onBeforeUnmount(() => chart.value?.destroy())
</script>

<template>
  <div class="relative h-full w-full">
    <canvas ref="canvas" role="img" :aria-label="label" />
  </div>
</template>
