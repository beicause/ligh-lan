<script setup lang="ts">
import { darkTheme } from 'naive-ui'
import { computed } from 'vue';
import Main from './views/Main.vue'
import { theme } from './common/state'
import { electron } from './common/electron';

const _theme = computed(() => {
  electron?.send('theme', theme.value)
  window.localStorage.setItem('theme', theme.value)
  return theme.value === 'light' ? null : darkTheme
})
</script>

<template>
  <NConfigProvider :theme="_theme">
    <NMessageProvider>
      <NDialogProvider>
        <Main></Main>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
</style>
