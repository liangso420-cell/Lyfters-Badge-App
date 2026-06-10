<template>
  <div class="min-h-screen bg-base">
    <AdminHeader />
    <div class="max-w-2xl mx-auto px-4 py-8">
      <div class="bg-white rounded-card shadow-soft p-8">
        <h2 class="text-xl font-bold mb-1">Badges — {{ eventoNombre }}</h2>
        <p class="text-sm text-gray-400 mb-6">Crea badges y genera sus códigos QR</p>

        <!-- Lista de badges -->
        <div v-if="badges.length" class="space-y-3 mb-6">
          <div
            v-for="b in badges"
            :key="b.id"
            class="flex items-center justify-between p-4 rounded-card bg-base"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ b.icon }}</span>
              <div>
                <p class="font-medium">{{ b.nombre }}</p>
                <p class="text-xs text-gray-400">{{ b.descripcion }}</p>
              </div>
            </div>
            <button
              class="px-4 py-2 rounded-btn text-sm font-medium text-primary border border-primary"
              @click="ver = b"
            >
              Ver QR
            </button>
          </div>
        </div>
        <p v-else class="text-gray-400 text-sm mb-6">Aún no hay badges en este evento.</p>

        <!-- Formulario inline agregar badge -->
        <div class="p-4 rounded-card border border-dashed border-gray-300 mb-6">
          <p class="text-sm font-semibold mb-3 text-gray-700">➕ Agregar nuevo badge</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              v-model="form.icon"
              type="text"
              placeholder="🏅"
              maxlength="2"
              class="px-4 py-3 bg-white rounded-btn border border-gray-200 focus:border-primary outline-none text-center"
            />
            <input
              v-model="form.nombre"
              type="text"
              placeholder="Nombre del badge"
              class="px-4 py-3 bg-white rounded-btn border border-gray-200 focus:border-primary outline-none sm:col-span-2"
            />
          </div>
          <input
            v-model="form.descripcion"
            type="text"
            placeholder="Descripción"
            class="w-full mt-3 px-4 py-3 bg-white rounded-btn border border-gray-200 focus:border-primary outline-none"
          />
          <p v-if="error" class="text-sm text-red-500 mt-2">{{ error }}</p>
          <button
            :disabled="saving"
            class="mt-3 px-5 py-2.5 rounded-btn text-white font-medium text-sm bg-primary disabled:opacity-60"
            @click="agregar"
          >
            {{ saving ? 'Generando…' : 'Agregar badge' }}
          </button>
        </div>

        <!-- QR generado / visor -->
        <div v-if="ver" class="p-6 rounded-card bg-primary-soft text-center">
          <p class="text-sm font-semibold text-primary mb-3">QR de "{{ ver.nombre }}"</p>
          <div class="inline-block bg-white p-3 rounded-card shadow-soft">
            <img :src="ver.qr_image" :alt="`QR ${ver.nombre}`" width="180" height="180" />
          </div>
          <p class="text-xs text-gray-400 mt-2 break-all">{{ ver.redeem_url }}</p>
          <button
            class="mt-3 px-5 py-2.5 rounded-btn text-white font-medium text-sm bg-primary"
            @click="descargar(ver)"
          >
            ⬇️ Descargar QR
          </button>
        </div>
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
const form = ref({ icon: '🏅', nombre: '', descripcion: '' })
const ver = ref(null)
const saving = ref(false)
const error = ref('')

async function load() {
  const { data } = await api.get(`/admin/events/${eventId}/badges`)
  eventoNombre.value = data.evento?.nombre || ''
  badges.value = data.badges
}

onMounted(load)

async function agregar() {
  error.value = ''
  if (!form.value.nombre) {
    error.value = 'El nombre del badge es obligatorio'
    return
  }
  saving.value = true
  try {
    const { data } = await api.post(`/admin/events/${eventId}/badge`, form.value)
    form.value = { icon: '🏅', nombre: '', descripcion: '' }
    await load()
    ver.value = data // muestra el QR recién generado
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo crear el badge'
  } finally {
    saving.value = false
  }
}

function descargar(badge) {
  const a = document.createElement('a')
  a.href = badge.qr_image
  a.download = `qr-${badge.nombre.replace(/\s+/g, '-').toLowerCase()}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>
