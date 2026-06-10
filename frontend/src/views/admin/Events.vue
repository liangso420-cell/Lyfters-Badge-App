<template>
  <div class="min-h-screen bg-base">
    <AdminHeader />
    <div class="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <!-- Crear evento -->
      <div class="bg-white rounded-card shadow-soft p-8">
        <h2 class="text-xl font-bold mb-1">Crear evento</h2>
        <p class="text-sm text-gray-400 mb-6">Configura un nuevo evento de badges</p>

        <form class="space-y-4" @submit.prevent="crear">
          <div>
            <label class="text-sm font-medium text-gray-600">Nombre del evento</label>
            <input
              v-model="form.nombre"
              type="text"
              placeholder="Lyfter Summit 2026"
              class="w-full mt-1 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600">Descripción</label>
            <textarea
              v-model="form.descripcion"
              rows="3"
              placeholder="Descripción del evento..."
              class="w-full mt-1 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none"
            ></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-600">Fecha inicio</label>
              <input
                v-model="form.fecha_inicio"
                type="date"
                class="w-full mt-1 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">Fecha fin</label>
              <input
                v-model="form.fecha_fin"
                type="date"
                class="w-full mt-1 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600">Premio sorpresa 🎁</label>
            <input
              v-model="form.premio"
              type="text"
              placeholder="Entrada VIP al after-party"
              class="w-full mt-1 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none"
            />
          </div>

          <p v-if="error" class="text-sm text-red-500 bg-red-50 rounded-btn px-3 py-2">
            {{ error }}
          </p>

          <button
            type="submit"
            :disabled="saving"
            class="w-full py-3 rounded-btn text-white font-semibold bg-primary disabled:opacity-60"
          >
            {{ saving ? 'Creando…' : 'Crear evento' }}
          </button>
        </form>
      </div>

      <!-- Listado de eventos -->
      <div class="bg-white rounded-card shadow-soft p-8">
        <h2 class="text-xl font-bold mb-4">Tus eventos</h2>
        <div v-if="!events.length" class="text-gray-400 text-sm">Aún no has creado eventos.</div>
        <div v-else class="space-y-3">
          <div
            v-for="e in events"
            :key="e.id"
            class="flex items-center justify-between p-4 rounded-card bg-base"
          >
            <div>
              <p class="font-medium">{{ e.nombre }}</p>
              <p class="text-xs text-gray-400">🎁 {{ e.premio || 'Sin premio' }}</p>
            </div>
            <div class="flex gap-2">
              <router-link
                :to="`/admin/events/${e.id}/badges`"
                class="px-4 py-2 rounded-btn text-sm font-medium text-primary border border-primary"
              >
                Badges
              </router-link>
              <router-link
                :to="`/admin/events/${e.id}/dashboard`"
                class="px-4 py-2 rounded-btn text-sm font-medium text-white bg-primary"
              >
                Seguimiento
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../services/api'
import AdminHeader from '../../components/AdminHeader.vue'

const form = ref({ nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '', premio: '' })
const events = ref([])
const saving = ref(false)
const error = ref('')

async function load() {
  const { data } = await api.get('/admin/events')
  events.value = data
}

onMounted(load)

async function crear() {
  error.value = ''
  if (!form.value.nombre) {
    error.value = 'El nombre del evento es obligatorio'
    return
  }
  saving.value = true
  try {
    await api.post('/admin/event', form.value)
    form.value = { nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '', premio: '' }
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo crear el evento'
  } finally {
    saving.value = false
  }
}
</script>
