import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import icons from 'unplugin-icons/vite'
import windicss from 'vite-plugin-windicss'
import components from 'unplugin-vue-components/vite'
import resolvers from 'unplugin-vue-components/resolvers'
import iconResolver from 'unplugin-icons/resolver'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    icons(),
    windicss(),
    components({
      resolvers: [resolvers.NaiveUiResolver(), iconResolver()]
    })
  ],
  base: './'
})
