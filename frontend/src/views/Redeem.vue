<template>
  <div class="min-h-screen bg-base flex items-center justify-center px-4">
    <!-- Procesando -->
    <div v-if="loading" class="text-center">
      <div class="text-5xl animate-pulse-badge mb-3">🏆</div>
      <p class="text-gray-500">Canjeando tu badge…</p>
    </div>

    <!-- Duplicado o error -->
    <div
      v-else-if="info"
      class="w-full max-w-sm bg-white rounded-card shadow-soft p-8 text-center"
    >
      <div class="text-5xl mb-3">{{ info.icon }}</div>
      <h3 class="text-xl font-bold" :class="info.error ? 'text-red-500' : 'text-gray-800'">
        {{ info.title }}
      </h3>
      <p class="text-sm text-gray-500 mt-2">{{ info.message }}</p>
      <button
        class="mt-6 w-full py-3 rounded-btn text-white font-semibold bg-primary"
        @click="goProfile"
      >
        Ir a mi perfil
      </button>
    </div>

    <!-- Celebración -->
    <CelebrationModal
      v-if="celebrate"
      :badge="celebrate.badge"
      :completado="celebrate.completado"
      :premio="celebrate.premio"
      @close="goProfile"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import CelebrationModal from '../components/CelebrationModal.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const info = ref(null)
const celebrate = ref(null)

onMounted(async () => {
  const { eventId, token } = route.params
  try {
    const { data } = await api.post(`/redeem/${eventId}/${token}`)
    if (data.status === 'ok') {
      celebrate.value = {
        badge: data.badge,
        completado: data.completado,
        premio: data.premio,
      }
    } else if (data.status === 'duplicado') {
      info.value = {
        icon: data.badge?.icon || '🔁',
        title: 'Ya tienes este badge',
        message: 'Este QR ya fue canjeado en tu cuenta.',
      }
    }
  } catch (e) {
    info.value = {
      icon: '⚠️',
      error: true,
      title: 'QR inválido',
      message: e.response?.data?.error || 'No se pudo canjear este badge.',
    }
  } finally {
    loading.value = false
  }
})

function goProfile() {
  router.push('/profile')
}
</script>
