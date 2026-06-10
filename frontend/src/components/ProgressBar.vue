<template>
  <div>
    <div class="mb-1 flex justify-between text-sm">
      <span class="font-medium text-gray-700">Tu progreso</span>
      <span class="text-primary font-semibold">{{ obtained }} de {{ total }} badges</span>
    </div>
    <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
      <div class="h-3 rounded-full bg-primary transition-all duration-500" :style="{ width: pct + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  obtained: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
})

const pct = computed(() =>
  props.total > 0 ? Math.round((props.obtained / props.total) * 100) : 0,
)
</script>
