<script setup lang="ts">
import { computed, ref, h, VNode } from 'vue';
import { electron } from '../../common/electron'
import AkarIconsFile from '~icons/akar-icons/file'
import AlarityDirectorySolid from '~icons/clarity/directory-solid'

const dirs = ref([] as string[])
const trueAddress = ref([] as { type: 'local' | 'network', address: string, port: number }[])
const isServe = computed(() => trueAddress.value.length > 0)
const dirPath = ref('')
const ip = ref('0.0.0.0')
const port = ref('9980')
const iframeFile = ref('')
const pathHistory = ref([] as { type: 'dir' | 'file', path: string }[])
const historyPoint = ref(0)

function openDir() {
    electron?.openDialog({ title: '打开文件', properties: ['openDirectory'] })
        .then(res => {
            stop()
            dirPath.value = res[0]
            dirs.value = electron?.readDir(dirPath.value)
            pathHistory.value.push({ type: 'dir', path: dirPath.value })
            serve()
        })
}

function serve() {
    electron?.serveDir(dirPath.value, parseInt(port.value), ip.value).then(_address => {
        if (ip.value === '127.0.0.1') trueAddress.value = [{ type: 'local', address: '127.0.0.1', port: parseInt(port.value) }]
        else trueAddress.value = _address
    })
}
async function stop() {
    return await electron?.serveStop()
}
function clearData() {
    dirs.value = [] as string[]
    trueAddress.value = [] as { type: 'local' | 'network', address: string, port: number }[]
    dirPath.value = ''
    iframeFile.value = ''
    pathHistory.value = [] as { type: 'dir' | 'file', path: string }[]
    historyPoint.value = 0
}
const menu = computed(() =>
    dirs.value.map((file, index) => {
        return {
            label: () => h('span', file),
            key: dirPath.value + '/' + file,
            icon: () => electron?.isFile(dirPath.value + '/' + file) ? h(AkarIconsFile) : h(AlarityDirectorySolid)
        } as { label: () => VNode, key: string, icon: () => VNode }
    })
)
function onClickMenu(key: string) {
    if (electron?.isFile(key)) {
        iframeFile.value = key
        pathHistory.value.push({ type: 'file', path: key })
    }
    else {
        dirPath.value = key
        dirs.value = electron?.readDir(key)
        pathHistory.value.push({ type: 'dir', path: key })
    }
}

const freshPath = () => {
    const point = pathHistory.value[historyPoint.value + pathHistory.value.length - 1]
    iframeFile.value = ''
    if (point.type === 'dir') {
        dirPath.value = point.path
        dirs.value = electron?.readDir(point.path)
    }
    else iframeFile.value = point.path
}
function back() {
    historyPoint.value--
    const point = pathHistory.value[historyPoint.value + pathHistory.value.length - 1]
    if (!point) {
        historyPoint.value++
        return
    }
    freshPath()
}
function forward() {
    historyPoint.value++
    const point = pathHistory.value[historyPoint.value + pathHistory.value.length - 1]
    if (!point) {
        historyPoint.value--
        return
    }
    freshPath()
}

</script>

<template>
    <NLayout class="h-screen box-border" position="absolute">
        <NLayoutHeader class="mx-2 mt-2">
            <NH1>局域网共享</NH1>
        </NLayoutHeader>

        <div class="flex items-center">
            <NInputGroup class="w-140 ml-4">
                <NInputGroupLabel>IP</NInputGroupLabel>
                <div>
                    <NInput v-model:value="ip"></NInput>
                </div>

                <NInputGroupLabel>端口</NInputGroupLabel>
                <div>
                    <NInput v-model:value="port"></NInput>
                </div>
            </NInputGroup>
            <NButton circle class="mr-4" @click="() => { stop().then(() => serve()) }">
                <template #icon>
                    <NIcon size="18">
                        <i-el-refresh></i-el-refresh>
                    </NIcon>
                </template>
            </NButton>
            <NAlert :type="isServe ? 'success' : 'info'">
                <span v-for="address in trueAddress">
                    {{ `${address.type === 'local' ? '本地' : '网络'}: ${address.address.replace('127.0.0.1', 'localhost')}:${address.port}` }}
                    <br />
                </span>
                {{ isServe ? '' : '服务未开启' }}
            </NAlert>
            <NButton
                v-if="isServe"
                @click="() => { stop().then(() => clearData()) }"
                class="ml-4"
            >关闭服务</NButton>
        </div>

        <div v-if="!isServe" class="h-3/4 flex justify-center items-center">
            <NButton ghost type="primary" @click="openDir" size="large">选择共享文件</NButton>
        </div>
        <div v-else>
            <NButtonGroup class="ml-4">
                <NButton @click="back">
                    <template #icon>
                        <NIcon>
                            <i-akar-icons-arrow-back-thick-fill></i-akar-icons-arrow-back-thick-fill>
                        </NIcon>
                    </template>
                </NButton>
                <NButton @click="forward">
                    <template #icon>
                        <NIcon>
                            <i-akar-icons-arrow-forward-thick-fill></i-akar-icons-arrow-forward-thick-fill>
                        </NIcon>
                    </template>
                </NButton>
            </NButtonGroup>

            <NLayoutContent
                v-if="!iframeFile"
                class="mt-4"
                style="height: 75vh;"
                :native-scrollbar="false"
            >
                <NCard>
                    <NMenu @update-value="onClickMenu" :options="menu"></NMenu>
                </NCard>
            </NLayoutContent>
            <iframe v-else style="height: 75vh;" class="w-full border-none" :src="iframeFile"></iframe>
        </div>
    </NLayout>
</template>

<style>
::-webkit-scrollbar {
    display: none;
    border: 0;
}
</style>