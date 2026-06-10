<template>
  <div class="min-h-screen bg-base">
    <AdminHeader />
    <div class="max-w-3xl mx-auto px-4 py-8">
      <div class="bg-white rounded-card shadow-soft p-8">
        <h2 class="text-xl font-bold mb-1">Participación — {{ eventoNombre }}</h2>
        <p class="text-sm text-gray-400 mb-6">Estado de redención por badge</p>

        <p v-if="error" class="text-sm text-red-500 bg-red-50 rounded-btn px-3 py-2 mb-4">
          {{ error }}
        </p>

        <div v-if="badges.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-400 border-b border-gray-200">
                <th class="py-3 pr-4 font-medium">Badge</th>
                <th class="py-3 pr-4 font-medium">QR token</th>
                <th class="py-3 pr-4 font-medium">Canjeados</th>
                <th class="py-3 font-medium">Participantes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="b in badges" :key="b.id">
                <td class="py-3 pr-4"><span class="mr-2">{{ b.icon }}</span>{{ b.nombre }}</td>
                <td class="py-3 pr-4 text-gray-400 font-mono text-xs">{{ shortToken(b.token) }}</td>
                <td class="py-3 pr-4">
                  <span class="font-semibold text-primary">{{ b.canjeados }}</span>
                </td>
                <td class="py-3 text-gray-500">{{ b.canjeados }} participante(s)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-gray-400 text-sm">Este evento aún no tiene badges.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../services/api'
import AdminHeader from '../../components/AdminHeader.vue'

const route = useRoute()
const eventId = route.params.eventId

const eventoNombre = ref('')
const badges = ref([])
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get(`/admin/events/${eventId}/badges`)
    eventoNombre.value = data.evento?.nombre || ''
    badges.value = data.badges
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el seguimiento'
  }
})

function shortToken(token) {
  if (!token) return ''
  return `${token.slice(0, 4)}…${token.slice(-4)}`
}
</script>
