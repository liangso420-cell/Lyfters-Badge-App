import { defineStore } from 'pinia'
import api from '../services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.rol === 'admin',
  },
  actions: {
    _persist(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password })
      this._persist(data.token, data.user)
      return data.user
    },
    async register(nombre, email, password) {
      const { data } = await api.post('/auth/register', { nombre, email, password })
      this._persist(data.token, data.user)
      return data.user
    },
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
  },
})
