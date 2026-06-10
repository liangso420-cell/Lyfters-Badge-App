<template>
  <div class="min-h-screen bg-base pb-28">
    <div class="max-w-md mx-auto px-4 pt-8">
      <div class="bg-white rounded-card shadow-soft p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-xl font-bold">Hola, {{ firstName }} 👋</h2>
          <button class="text-sm text-gray-400 hover:text-primary" @click="logout">⎋ Salir</button>
        </div>

        <!-- Selector de evento -->
        <label class="text-sm font-medium text-gray-600">Evento activo</label>
        <select
          v-model="selectedEventId"
          class="w-full mt-1 mb-5 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none"
          @change="loadEvent"
        >
          <option v-for="e in events" :key="e.id" :value="e.id">{{ e.nombre }}</option>
        </select>

        <p v-if="error" class="text-sm text-red-500 bg-red-50 rounded-btn px-3 py-2 mb-4">
          {{ error }}
        </p>

        <div v-if="loading" class="text-center text-gray-400 py-8">Cargando…</div>

        <template v-else-if="detail">
          <!-- Progreso -->
          <div class="mb-6">
            <ProgressBar :obtained="detail.obtenidos" :total="detail.total_badges" />
          </div>

          <!-- Grid de badges -->
          <div class="grid grid-cols-3 gap-3">
            <BadgeCard v-for="b in detail.badges" :key="b.id" :badge="b" />
          </div>

          <!-- Completado: felicitación + premio -->
          <div
            v-if="detail.completado"
            class="mt-6 p-4 rounded-card bg-primary-soft text-center"
          >
            <div class="text-4xl mb-1">🎉</div>
            <h3 class="text-lg font-bold text-primary">¡Felicidades, {{ firstName }}!</h3>
            <p class="text-sm text-gray-500 mt-1">Completaste todos los badges del evento</p>
            <div class="mt-3 p-3 rounded-card bg-white">
              <p class="text-xs uppercase tracking-wide text-primary font-semibold">Tu premio</p>
              <p class="text-lg font-bold mt-1">🎟️ {{ detail.premio_revelado }}</p>
            </div>
          </div>

          <!-- Pendiente: premio bloqueado -->
          <div
            v-else
            class="mt-6 p-4 rounded-card border border-dashed border-gray-300 text-center text-sm text-gray-500"
          >
            🎁 Completa los {{ detail.total_badges }} badges para revelar el
            <span class="font-medium text-gray-700">premio sorpresa</span>
          </div>
        </template>

        <div v-else class="text-center text-gray-400 py-8">
          No hay eventos disponibles todavía.
        </div>
      </div>
    </div>

    <!-- Botón flotante escanear -->
    <div class="fixed bottom-0 left-0 right-0 flex justify-center pb-6 pointer-events-none">
      <button
        class="pointer-events-auto px-6 py-4 rounded-full text-white font-semibold flex items-center gap-2"
        style="background: #6c63ff; box-shadow: 0 4px 20px rgba(108, 99, 255, 0.4)"
        @click="showScanner = true"
      >
        📷 Escanear QR
      </button>
    </div>

    <!-- Escáner -->
    <QrScanner v-if="showScanner" @close="showScanner = false" @decoded="onDecoded" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import ProgressBar from '../components/ProgressBar.vue'
import BadgeCard from '../components/BadgeCard.vue'
import QrScanner from '../components/QrScanner.vue'

const router = useRouter()
const auth = useAuthStore()

const events = ref([])
const selectedEventId = ref(null)
const detail = ref(null)
const loading = ref(false)
const error = ref('')
const showScanner = ref(false)

const firstName = computed(() => (auth.user?.nombre || '').split(' ')[0] || 'participante')

onMounted(async () => {
  try {
    const { data } = await api.get('/events/')
    events.value = data
    if (data.length) {
      selectedEventId.value = data[0].id
      await loadEvent()
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar los eventos'
  }
})

async function loadEvent() {
  if (!selectedEventId.value) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/events/${selectedEventId.value}`)
    detail.value = data
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el evento'
  } finally {
    loading.value = false
  }
}

function onDecoded(text) {
  showScanner.value = false
  // El QR contiene la URL completa /redeem/<event>/<token>; extraemos la ruta.
  try {
    const url = new URL(text)
    router.push(url.pathname + url.search)
  } catch {
    // Si no es URL absoluta, asumimos que ya es una ruta
    if (text.startsWith('/redeem/')) router.push(text)
  }
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>
