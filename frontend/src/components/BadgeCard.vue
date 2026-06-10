<template>
  <div
    class="rounded-card p-3 text-center transition"
    :class="badge.obtenido ? 'bg-primary-soft' : 'bg-gray-100'"
  >
    <div class="text-3xl" :class="{ 'opacity-40': !badge.obtenido }">
      {{ badge.icon || '🏅' }}
    </div>
    <p class="text-xs mt-1 truncate" :class="badge.obtenido ? 'font-medium' : 'text-gray-400'">
      {{ badge.nombre }}
    </p>
    <span class="text-sm" :class="badge.obtenido ? 'text-green-500' : 'text-gray-400'">
      {{ badge.obtenido ? '✅' : '🔒' }}
    </span>
  </div>
</template>

<script setup>
defineProps({
  badge: { type: Object, required: true },
})
</script>
