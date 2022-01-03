<script setup lang="ts">
import { ref } from 'vue';
import { electron } from '../../common/electron'

const dirs = ref([] as string[])
const address = ref([] as string[])
const open = () => {
    electron?.openDialog({ title: '打开文件', properties: ['openDirectory'] })
        .then(res => {
            dirs.value = electron?.readDir(res[0])
            electron?.serveDir(res[0], 11111).then(_address => {
                address.value = _address
            })
        })
}
</script>

<template>
    <div class="flex w-full h-screen">
        <div class="m-auto flex flex-col">
            {{ address.length>0?address.join('\n'):'服务未开启' }}
            <NButton @click="open">打开</NButton>
            <p v-for="dir in dirs">{{ dir }}</p>
        </div>
    </div>
</template>