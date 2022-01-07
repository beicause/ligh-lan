import { ref } from 'vue'

export const theme = ref<'light' | 'dark'>(
  (window.localStorage.getItem('theme') as undefined | 'light' | 'dark') ||
    'light'
)
