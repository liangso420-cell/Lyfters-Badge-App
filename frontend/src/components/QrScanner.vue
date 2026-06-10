<template>
  <div class="fixed inset-0 z-50" style="background: #111">
    <!-- Cerrar -->
    <button
      class="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur"
      @click="$emit('close')"
    >
      ✕
    </button>

    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <!-- Visor de cámara (html5-qrcode monta el video aquí) -->
      <div class="relative" style="width: 260px; height: 260px">
        <div id="qr-reader" class="w-full h-full overflow-hidden rounded-card"></div>
        <span class="scanner-corner corner-tl"></span>
        <span class="scanner-corner corner-tr"></span>
        <span class="scanner-corner corner-bl"></span>
        <span class="scanner-corner corner-br"></span>
      </div>
      <p class="text-gray-300 mt-8 text-sm">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'

const emit = defineEmits(['close', 'decoded'])
const message = ref('Apunta al código QR')
let scanner = null

onMounted(async () => {
  scanner = new Html5Qrcode('qr-reader')
  try {
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        emit('decoded', decodedText)
      },
      () => {}, // ignorar errores por frame
    )
  } catch (e) {
    message.value = 'No se pudo acceder a la cámara'
  }
})

onBeforeUnmount(async () => {
  if (scanner) {
    try {
      await scanner.stop()
      scanner.clear()
    } catch (e) {
      /* noop */
    }
  }
})
</script>
