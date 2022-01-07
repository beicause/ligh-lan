<script setup lang="ts">
import { darkTheme } from 'naive-ui'
import Main from './views/Main.vue';

</script>

<template>
  <NConfigProvider :theme="darkTheme">
      <NMessageProvider><NDialogProvider><Main></Main></NDialogProvider></NMessageProvider>
  </NConfigProvider>
</template>

<style>
</style>
