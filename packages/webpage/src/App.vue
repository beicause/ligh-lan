<script setup lang="ts">
import { darkTheme } from 'naive-ui'

</script>

<template>
  <NConfigProvider :theme="darkTheme">
      <NMessageProvider><router-view></router-view></NMessageProvider>
  </NConfigProvider>
</template>

<style>
</style>
