<template>
  <header class="bg-white shadow-soft">
    <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
      <router-link to="/admin/events" class="flex items-center gap-2 font-bold text-primary">
        🏆 Lyfter Badge App
      </router-link>
      <div class="flex items-center gap-4">
        <span class="text-sm text-gray-400 hidden sm:inline">Admin · {{ auth.user?.nombre }}</span>
        <button class="text-sm text-gray-400 hover:text-primary" @click="logout">⎋ Salir</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

function logout() {
  auth.logout()
  router.push('/login')
}
</script>
