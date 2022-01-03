<script setup lang="ts">
import { darkTheme } from 'naive-ui'

</script>

<template>
  <NConfigProvider :theme="darkTheme">
      <router-view></router-view>
  </NConfigProvider>
</template>

<style>
</style>
