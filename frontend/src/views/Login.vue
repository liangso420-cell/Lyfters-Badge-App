<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-base">
    <div class="w-full max-w-md bg-white rounded-card shadow-soft p-8">
      <div class="text-center mb-6">
        <div class="text-4xl mb-2">🏆</div>
        <h2 class="text-2xl font-bold">Lyfter Badge App</h2>
        <p class="text-gray-400 text-sm mt-1">Escanea, colecciona, gana</p>
      </div>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="text-sm font-medium text-gray-600">Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="tu@correo.com"
            class="w-full mt-1 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600">Contraseña</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full mt-1 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none"
          />
        </div>

        <p v-if="error" class="text-sm text-red-500 bg-red-50 rounded-btn px-3 py-2">
          {{ error }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 rounded-btn text-white font-semibold bg-primary disabled:opacity-60"
        >
          {{ loading ? 'Entrando…' : 'Entrar' }}
        </button>

        <p class="text-center text-sm text-gray-500">
          ¿No tienes cuenta?
          <router-link to="/register" class="text-primary font-medium">Regístrate</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    const user = await auth.login(email.value, password.value)
    const next = route.query.next
    if (next) {
      router.push(next)
    } else {
      router.push(user.rol === 'admin' ? '/admin/events' : '/profile')
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>
