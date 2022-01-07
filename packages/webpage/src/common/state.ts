import { computed, ref } from 'vue'

export const theme = ref<'light' | 'dark'>(
  (window.localStorage.getItem('theme') as undefined | 'light' | 'dark') ||
    'light'
)

export const width = ref(0)

window.onresize = () => {
  width.value = window.document.getElementById('__width')!.clientWidth
}
window.onload = () => {
  width.value = window.document.getElementById('__width')!.clientWidth
}
export const sm = computed(() => width.value > 640)
export const md = computed(() => width.value > 768)
export const lg = computed(() => width.value > 1024)
export const xl = computed(() => width.value > 1280)
