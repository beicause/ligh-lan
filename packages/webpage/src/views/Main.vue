<script setup lang="ts">
import { computed, ref, h, VNode, onUnmounted, watch } from 'vue'
import { electron } from '../../common/electron'
import AkarIconsFile from '~icons/akar-icons/file'
import AlarityDirectorySolid from '~icons/clarity/directory-solid'
import CarbonDownload from '~icons/carbon/download'
import axios from 'axios'
import { NButton, NEllipsis, useMessage } from 'naive-ui'
import path from 'path/posix'

type FileNode = { type: 'file', path: string } | { type: 'dir', path: string, children: FileNode[] }
const message = useMessage()
const fileInfo = ref(undefined as FileNode | undefined)
const trueAddress = ref([] as { type: 'local' | 'network', address: string, port: number }[])
const isServing = computed(() => {
    if (!electron) return fileInfo.value !== undefined
    else return trueAddress.value.length !== 0
})
const serverRoot = ref('')
const currentDir = ref('')
const ip = ref('0.0.0.0')
const port = ref(9980)
const displayFile = ref(undefined as { path: string, href: string, ext: string } | undefined)
const displayImg = ref('')
const displayText = ref('')
const historyPath = ref([] as FileNode[])
const historyPoint = ref(0)
const tmpFileName = 'ligh_lan_file_data.json'
const fileInfoFile = computed(() => serverRoot.value + '/' + tmpFileName)

const dirChildren = computed(() => {
    if (!(fileInfo.value?.type === 'dir')) return []
    let children = [] as FileNode[]

    const search = (node: FileNode) => {
        if (!(node.type === 'dir')) return
        if (node.path === currentDir.value) {
            children = node.children
            return
        }
        for (const c of node.children) {
            if (c.type === 'dir') {
                if (c.path === currentDir.value) {
                    children = c.children
                    return
                }
                else search(c)
            }
        }
    }
    search(fileInfo.value)
    return children
})
axios.get(tmpFileName).then(res => {
    fileInfo.value = res.data
    if (!fileInfo.value) return
    currentDir.value = fileInfo.value.path
    serverRoot.value = currentDir.value
    historyPath.value.push(fileInfo.value)
}).catch(err => console.log(err))

function getFileInfo(root: string): FileNode {
    const dirs: string[] = electron?.readDir(root)
    return {
        type: 'dir', path: root, children: dirs.map(_dir => {
            const dir = root + '/' + _dir
            if (electron?.isFile(dir)) return { type: 'file', path: dir }
            const children = electron?.readDir(dir).map((d: string) => dir + '/' + d) as string[] | undefined
            if (!children || children.every(d => electron?.isFile(d)))
                return { type: 'dir', path: dir, children: children?.map(c => { return { type: 'file', path: c } }) }
            return getFileInfo(dir)
        })
    } as FileNode
}

function writeFileInfo() {
    electron?.writeFile(fileInfoFile.value, JSON.stringify(fileInfo.value))
}

function openDir() {
    electron?.openDialog({ title: '打开文件', properties: ['openDirectory'] })
        .then(res => {
            if (res.length === 0) return
            stop()
            serverRoot.value = res[0]
            serve()
        })
}
window.ondragover = e => {
    e.preventDefault()
}
window.ondrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer?.files[0]) {
        stop()
        serverRoot.value = e.dataTransfer.files[0].path
        serve()
    }
}

function serve() {
    currentDir.value = serverRoot.value
    fileInfo.value = getFileInfo(serverRoot.value)
    writeFileInfo()
    historyPath.value.push(fileInfo.value)
    electron?.serveDir(currentDir.value, port.value, ip.value).then(_address => {
        if (ip.value === '127.0.0.1') trueAddress.value = [{ type: 'local', address: '127.0.0.1', port: port.value }]
        else trueAddress.value = _address
    }).catch(err => message.error('启动失败'))
}
async function stop() {
    electron?.remove(fileInfoFile.value)
    trueAddress.value = []
    clearData()
    return await electron?.serveStop()
}
function clearData() {
    trueAddress.value = [] as { type: 'local' | 'network', address: string, port: number }[]
    currentDir.value = ''
    displayFile.value = undefined
    historyPath.value = []
    historyPoint.value = 0
    fileInfo.value = undefined
}

const renderFileName = (file: string) => h(NEllipsis, null, { default: () => file.substring(file.lastIndexOf('/') + 1) })
const menu = computed(() =>
    dirChildren.value.map((file) => {
        return {
            label: () => file.type === 'dir'
                ? renderFileName(file.path)
                : h('div',
                    { style: { display: 'flex', justifyContent: 'space-between' } },
                    [
                        renderFileName(file.path),
                        h(NButton,
                            { tag: 'a', href: getFileHref(file.path), download: getFileHref(file.path), onClick: e => e.stopPropagation() },
                            { default: () => h(CarbonDownload) })
                    ]),
            key: JSON.stringify({ path: file.path, type: file.type }),
            icon: () => file.type === 'file' ? h(AkarIconsFile) : h(AlarityDirectorySolid)
        } as { label: () => VNode, key: string, icon: () => VNode }
    })
)
function onClickMenu(_key: string) {
    const key = JSON.parse(_key) as FileNode
    if (key.type === 'file') displayFile.value = file(key.path)
    else currentDir.value = key.path
    const point = historyPoint.value + historyPath.value.length - 1
    if (point >= 0) historyPath.value = historyPath.value.slice(0, point + 1)
    historyPath.value.push(key)
    historyPoint.value = 0
}

const freshPath = () => {
    const point = historyPath.value[historyPoint.value + historyPath.value.length - 1]
    displayFile.value = undefined
    if (point.type === 'dir') currentDir.value = point.path
    else displayFile.value = file(point.path)
}
function back() {
    historyPoint.value--
    const point = historyPath.value[historyPoint.value + historyPath.value.length - 1]
    if (!point) {
        historyPoint.value++
        return
    }
    freshPath()
}
function forward() {
    historyPoint.value++
    const point = historyPath.value[historyPoint.value + historyPath.value.length - 1]
    if (!point) {
        historyPoint.value--
        return
    }
    freshPath()
}

function file(path: string) {
    return {
        path,
        href: getFileHref(path),
        ext: getFileExt(path)
    }
}
function getFileHref(path: string) {
    return path.replace(serverRoot.value, '.')
}
function getFileExt(path: string) {
    return path.substring(path.lastIndexOf('.'))
}

const imgExt = ['apng', 'avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'].map(f => '.' + f)

watch(() => displayFile.value, file => {
    if (!file) {
        displayImg.value = ''
        displayText.value = ''
        return
    }
    if (imgExt.indexOf(file.ext) !== -1) {
        if (electron) displayImg.value = file.path
        else displayImg.value = file.href
    }
    else {
        if (electron) displayText.value = electron.readFile(file.path)
        axios.get(file.href, { responseType: 'text' }).then(res => {
            displayText.value = res.data
        })
    }
})

onUnmounted(() => stop())

</script>

<template>
    <NLayout class="h-screen box-border" position="absolute">
        <NLayoutHeader class="mx-2 mt-2">
            <NH1>局域网共享{{ electron ? '——服务端' : '' }}</NH1>
        </NLayoutHeader>

        <div class="flex items-center flex-wrap" v-if="electron">
            <div class="flex max-w-1/1">
                <NInputGroup class="px-3">
                    <NInputGroupLabel style="min-width: 36px;">IP</NInputGroupLabel>
                    <NInput style="width: 240px;" v-model:value="ip"></NInput>
                    <NInputGroupLabel style="min-width: 52px;">端口</NInputGroupLabel>
                    <NInputNumber style="width: 240px;" :show-button="false" v-model:value="port"></NInputNumber>
                </NInputGroup>
                <NButton circle @click="() => { stop().then(() => serve()) }">
                    <template #icon>
                        <NIcon size="18">
                            <i-el-refresh></i-el-refresh>
                        </NIcon>
                    </template>
                </NButton>
            </div>
            <NAlert class="m-4" :type="isServing ? 'success' : 'info'">
                <span v-for="address in trueAddress">
                    {{ `${address.type === 'local' ? '本地' : '网络'}: ${address.address.replace('127.0.0.1', 'localhost')}:${address.port}` }}
                    <br />
                </span>
                {{ isServing ? '' : '服务未开启' }}
            </NAlert>
            <NButton v-if="isServing" @click="stop" class="ml-4">关闭服务</NButton>
        </div>

        <div v-if="!isServing" class="h-3/4 flex justify-center items-center">
            <NButton ghost type="primary" @click="openDir" size="large">选择或拖拽文件夹</NButton>
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
                v-show="!displayFile"
                class="mt-4"
                style="height: 80vh;"
                :native-scrollbar="false"
            >
                <NCard>
                    <NMenu @update-value="onClickMenu" :options="menu"></NMenu>
                </NCard>
            </NLayoutContent>
            <div v-show="displayFile" style="height: 80vh;" class="w-full p-4">
                <img :src="displayImg" class="m-auto" />
                <NText>{{ displayText }}</NText>
            </div>
        </div>
    </NLayout>
</template>

<style>
::-webkit-scrollbar {
    display: none;
    border: 0;
}
</style>