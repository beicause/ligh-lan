<script setup lang="ts">
import { GlobalThemeOverrides } from 'naive-ui'
const themeOverrides:GlobalThemeOverrides={
  common:{
    primaryColor:'#2196f3',
    primaryColorHover:'#2196f3',
    primaryColorPressed:'#0a70c2'
  }
}

</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <router-view></router-view>
  </NConfigProvider>
</template>

<style>
</style>
