<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-6"
    style="background: rgba(17, 24, 39, 0.7)"
  >
    <div class="bg-white rounded-card shadow-soft p-8 text-center w-full max-w-sm">
      <div class="text-6xl animate-pulse-badge mb-4">{{ badge.icon || '🏅' }}</div>

      <h3 class="text-2xl font-bold text-primary">
        {{ completado ? '¡Completaste el evento!' : '¡Badge obtenido!' }}
      </h3>
      <p class="text-lg font-semibold mt-2">{{ badge.nombre }}</p>
      <p v-if="badge.descripcion" class="text-sm text-gray-500 mt-1">
        {{ badge.descripcion }}
      </p>

      <div v-if="completado && premio" class="mt-4 p-4 rounded-card bg-primary-soft">
        <p class="text-xs uppercase tracking-wide text-primary font-semibold">
          Premio desbloqueado
        </p>
        <p class="text-lg font-bold mt-1">🎟️ {{ premio }}</p>
      </div>

      <button
        class="mt-6 w-full py-3 rounded-btn text-white font-semibold bg-primary"
        @click="$emit('close')"
      >
        ¡Genial!
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  badge: { type: Object, required: true },
  completado: { type: Boolean, default: false },
  premio: { type: String, default: null },
})
defineEmits(['close'])
</script>
