<script setup lang="ts">
import { computed, ref, h, VNode, onUnmounted } from 'vue'
import { electron } from '../../common/electron'
import AkarIconsFile from '~icons/akar-icons/file'
import AlarityDirectorySolid from '~icons/clarity/directory-solid'
import axios from 'axios'
import { useMessage } from 'naive-ui'

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
const port = ref('9980')
const iframeFile = ref('')
const pathHistory = ref([] as FileNode[])
const historyPoint = ref(0)
const tmpFileName = 'ligh_lan_file_data.json'
const fileInfoFile = computed(() => serverRoot.value + '/' + tmpFileName)

const dirChildrenName = computed(() => {
    if (!(fileInfo.value?.type === 'dir')) return []
    let children = [] as { name: string, type: 'dir' | 'file' }[]

    const resolveChildren = (nodes: FileNode[]) => {
        children = nodes.map(child => {
            return {
                name: child.path.replace(currentDir.value + '/', ''),
                type: child.type
            }
        })
    }
    const search = (node: FileNode) => {
        if (!(node.type === 'dir')) return
        if (node.path === currentDir.value) {
            resolveChildren(node.children)
            return
        }
        node.children.forEach(c => {
            if (c.type === 'dir') {
                if (c.path === currentDir.value) {
                    resolveChildren(c.children)
                    return
                }
                else search(c)
            }
        })
    }
    search(fileInfo.value)
    return children
})
axios.get(tmpFileName).then(res => {
    fileInfo.value = res.data
    if (!fileInfo.value) return
    currentDir.value = fileInfo.value.path
    serverRoot.value = currentDir.value
    pathHistory.value.push(fileInfo.value)
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
            currentDir.value = serverRoot.value
            fileInfo.value = getFileInfo(serverRoot.value)
            writeFileInfo()
            pathHistory.value.push(fileInfo.value)
            serve()
        })
}
window.ondragover=e=>{
    e.preventDefault()
}
window.ondrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer?.files[0]) {
        stop()
        serverRoot.value = e.dataTransfer.files[0].path
        currentDir.value = serverRoot.value
        fileInfo.value = getFileInfo(serverRoot.value)
        writeFileInfo()
        pathHistory.value.push(fileInfo.value)
        serve()
    }
}

function serve() {
    electron?.serveDir(currentDir.value, parseInt(port.value), ip.value).then(_address => {
        if (ip.value === '127.0.0.1') trueAddress.value = [{ type: 'local', address: '127.0.0.1', port: parseInt(port.value) }]
        else trueAddress.value = _address
    }).catch(err => message.error('启动失败'))
}
async function stop() {
    electron?.remove(fileInfoFile.value)
    trueAddress.value = []
    return await electron?.serveStop()
}
function clearData() {
    trueAddress.value = [] as { type: 'local' | 'network', address: string, port: number }[]
    currentDir.value = ''
    iframeFile.value = ''
    pathHistory.value = []
    historyPoint.value = 0
    fileInfo.value = undefined
}
const menu = computed(() =>
    dirChildrenName.value.map((file, index) => {
        return {
            label: () => h('span', file.name),
            key: JSON.stringify({ path: currentDir.value + '/' + file.name, type: file.type }),
            icon: () => file.type === 'file' ? h(AkarIconsFile) : h(AlarityDirectorySolid)
        } as { label: () => VNode, key: string, icon: () => VNode }
    })
)
function onClickMenu(_key: string) {
    const key = JSON.parse(_key) as FileNode
    if (key.type === 'file') iframeFile.value = key.path.replace(serverRoot.value, '')
    else currentDir.value = key.path
    const point = historyPoint.value + pathHistory.value.length - 1
    if (point >= 0) pathHistory.value = pathHistory.value.slice(0, point + 1)
    pathHistory.value.push(key)
    historyPoint.value = 0
}

const freshPath = () => {
    const point = pathHistory.value[historyPoint.value + pathHistory.value.length - 1]
    iframeFile.value = ''
    if (point.type === 'dir') currentDir.value = point.path
    else iframeFile.value = iframeFile.value = point.path.replace(serverRoot.value, '')
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

onUnmounted(() => stop())

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
            <NButton
                :disabled="!electron"
                circle
                class="mr-4"
                @click="() => { stop().then(() => serve()) }"
            >
                <template #icon>
                    <NIcon size="18">
                        <i-el-refresh></i-el-refresh>
                    </NIcon>
                </template>
            </NButton>
            <NAlert :type="isServing ? 'success' : 'info'">
                <span v-for="address in trueAddress">
                    {{ `${address.type === 'local' ? '本地' : '网络'}: ${address.address.replace('127.0.0.1', 'localhost')}:${address.port}` }}
                    <br />
                </span>
                {{ isServing ? '' : '服务未开启' }}
            </NAlert>
            <NButton
                v-if="isServing && electron"
                @click="() => { stop().then(() => clearData()) }"
                class="ml-4"
            >关闭服务</NButton>
        </div>

        <div v-if="!isServing" class="h-3/4 flex justify-center items-center">
            <NButton ghost type="primary" @click="openDir" size="large">选择或拖拽文件夹</NButton>
        </div>
        <div v-else>
            <NButtonGroup class="ml-4 mt-4">
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
            <iframe
                v-else
                style="height: 75vh;"
                class="w-full border-none mt-4 mx-4"
                :src="iframeFile"
            ></iframe>
        </div>
    </NLayout>
</template>

<style>
::-webkit-scrollbar {
    display: none;
    border: 0;
}
</style>