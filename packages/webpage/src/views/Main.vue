<script setup lang="ts">
// @ts-ignore
import AkarIconsFile from '~icons/akar-icons/file'
// @ts-ignore
import AlarityDirectorySolid from '~icons/clarity/directory-solid'
// @ts-ignore
import CarbonDownload from '~icons/carbon/download'
// @ts-ignore
import CarbonDelete from '~icons/carbon/delete'
import { computed, ref, h, VNode, watch } from 'vue'
import { electron } from '../common/electron'
import axios from 'axios'
import { NButton, NEllipsis, UploadFileInfo, useDialog, useMessage } from 'naive-ui'
import pkg from '../../package.json'
import { theme } from '../common/state'
import { sm } from '../common/state'

type FileNode = { type: 'file', path: string } | { type: 'dir', path: string, children: FileNode[] }
const message = useMessage()
const dialog = useDialog()
const fileInfo = ref(undefined as FileNode | undefined)
const trueAddress = ref([] as { type: 'local' | 'network', address: string, port: number }[])
const isServing = computed(() => {
    if (!electron) return fileInfo.value !== undefined
    else return trueAddress.value.length !== 0
})
const serverRoot = ref('')
const currentDir = ref('')
const ip = ref('0.0.0.0')
const port = ref(9850)
const displayFile = ref(undefined as { path: string, href: string, ext: string } | undefined)
const displayImg = ref('')
const displayText = ref('')
const showModel = ref(false)
const inputFileName = ref('')
const inputType = ref('file' as 'file' | 'dir')
const editMode = ref(false)
const editText = ref('')
let ws = null as WebSocket | null
const uploadFileList = ref([] as UploadFileInfo[])
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
function receiveWs() {
    ws!.onmessage = res => {
        const data = JSON.parse(res.data)
        switch (data.mode) {
            case 'fileInfo':
                fileInfo.value = data.data
                if (fileInfo.value) {
                    currentDir.value = fileInfo.value.path
                    serverRoot.value = currentDir.value
                }
                break
            case 'ioe':
                message.error(data.message)
                break
            case 'fileWritten':
                changeDisplayText(displayFile.value!)
                break
        }
    }
}
function connectWs() {
    ws = new WebSocket(electron ? `ws://${ip.value}:${port.value}` : `ws://${window.location.host}`)
    ws.onerror = (e) => {
        message.error('network error:' + (e as any).message, { closable: true, duration: 300000 })
    }
    ws.onopen = () => console.log('client connected')
}

function openDir() {
    electron?.openDialog({ title: 'select directory', properties: ['openDirectory'] })
        .then((res: string[]) => {
            if (res.length === 0) return
            serverRoot.value = res[0]
            serve()
        })
}

async function serve() {
    currentDir.value = serverRoot.value
    const _address = await electron?.serveDir(currentDir.value, port.value, ip.value).catch(err => {
        console.log(err)
        message.error('fail to launch')
    })
    if (!_address) {
        message.error('fail to launch')
        return
    }
    if (ip.value === '127.0.0.1') trueAddress.value = [{ type: 'local', address: '127.0.0.1', port: port.value }]
    else trueAddress.value = _address
    connectWs()
    receiveWs()
}

function onClickMenu(_key: string) {
    editMode.value = false
    const key = JSON.parse(_key) as FileNode
    if (key.type === 'file') displayFile.value = getFileInfo(key.path)
    else currentDir.value = key.path
    window.history.pushState(key, '')
}

const freshPath = () => {
    const top = window.history.state as FileNode | null
    displayFile.value = undefined
    if (top === null) currentDir.value = serverRoot.value
    else if (top.type === 'dir') currentDir.value = top.path
    else displayFile.value = getFileInfo(top.path)
}
function back() {
    window.history.back()
}
function forward() {
    window.history.forward()
}

function getFileInfo(path: string) {
    return {
        path,
        href: getFileHref(path),
        ext: getFileExt(path)
    }
}
function getFileHref(path: string) {
    return path.replace(serverRoot.value, '')
}
function getFileExt(path: string) {
    return path.substring(path.lastIndexOf('.'))
}
function getFileName(path: string) {
    return path.substring(path.lastIndexOf('/') + 1)
}

function newFileConfirm() {
    if (inputType.value === 'file') {
        ws?.send(JSON.stringify({
            mode: 'mkFile',
            path: currentDir.value + '/' + inputFileName.value
        }))
    } else {
        ws?.send(JSON.stringify({
            mode: 'mkDir',
            path: currentDir.value + '/' + inputFileName.value
        }))
    }
}

function newFile() {
    inputType.value = 'file'
    showModel.value = true
}
function newDir() {
    inputType.value = 'dir'
    showModel.value = true
}

function onClickEdit() {
    editMode.value = !editMode.value
    if (editMode.value) {
        editText.value = displayText.value
    }
    else {
        ws?.send(JSON.stringify({
            mode: 'writeFile',
            path: displayFile.value?.path,
            data: editText.value
        }))
        changeDisplayText(displayFile.value!)
    }
}
function changeDisplayImg(file: NonNullable<typeof displayFile.value>) {
    displayImg.value = (electron ? `http://${ip.value}:${port.value}` : '') + file.href
}
function changeDisplayText(file: NonNullable<typeof displayFile.value>) {
    axios.get((electron ? `http://${ip.value}:${port.value}` : '') + file.href,
        { responseType: 'text', transformResponse: data => data }).then(res => {
            displayText.value = res.data
        })
}

function openGitHub() {
    const url = pkg.homepage
    if (!electron) window.open(url)
    else electron.send('openBrowser', url)
}

function onUploadList(e: UploadFileInfo[]) {
    uploadFileList.value = e.map(f => {
        f.name = f.name.substring(0, 10) + '...'
        return f
    })
}
const imgExt = ['apng', 'avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'].map(f => '.' + f)

window.onpopstate = () => {
    freshPath()
}
window.ondragover = e => {
    e.preventDefault()
}
window.ondrop = (e) => {
    e.preventDefault()
    if (!isServing.value && e.dataTransfer?.files[0]) {
        serverRoot.value = e.dataTransfer.files[0].path
        serve()
    }
}


watch(() => displayFile.value, file => {
    if (!file) {
        displayImg.value = ''
        displayText.value = ''
        return
    }
    if (imgExt.indexOf(file.ext) !== -1) {
        changeDisplayImg(file)
    }
    else {
        changeDisplayText(file)
    }
})

if (!electron) {
    connectWs()
    receiveWs()
}

const renderFileName = (path: string) =>
    h(NEllipsis,
        { style: { display: 'flex', alignItems: 'center' }, tooltip: false },
        { default: () => getFileName(path) }
    )
const menu = computed(() =>
    dirChildren.value.map((file) => {
        return {
            label: () =>
                h('div',
                    { style: { display: 'flex', justifyContent: 'space-between' } },
                    [
                        renderFileName(file.path),
                        h('div', [
                            file.type === 'file' ? h(NButton,
                                {
                                    size: sm.value ? 'medium' : 'tiny',
                                    tag: 'a', href: getFileHref(file.path), download: getFileHref(file.path), onClick: e => e.stopPropagation()
                                },
                                { default: () => h(CarbonDownload) }
                            ) : null,
                            h(NButton,
                                {
                                    size: sm.value ? 'medium' : 'tiny',
                                    onClick: e => {
                                        e.stopPropagation()
                                        dialog.warning({
                                            onPositiveClick: () => {
                                                ws?.send(JSON.stringify({
                                                    mode: 'delete',
                                                    path: file.path
                                                }))
                                            },
                                            title: 'Warning',
                                            content: 'are you sure to delete ' + getFileName(file.path) + '?',
                                            negativeText: 'cancel',
                                            positiveText: 'confirm'
                                        })
                                    }
                                },
                                { default: () => h(CarbonDelete) }
                            ),
                        ])
                    ]),
            key: JSON.stringify({ path: file.path, type: file.type }),
            icon: () => file.type === 'file' ? h(AkarIconsFile) : h(AlarityDirectorySolid)
        } as { label: () => VNode, key: string, icon: () => VNode }
    })
)
</script>

<template>
    <NModal
        v-model:show="showModel"
        preset="dialog"
        :title="'Create a ' + inputType"
        positive-text="confirm"
        @positive-click="newFileConfirm"
        @after-leave="() => inputFileName = ''"
    >
        <NInput
            :placeholder="'Enter the ' + inputType + ' name'"
            @keyup.enter="() => { showModel = false; newFileConfirm() }"
            v-model:value="inputFileName"
        ></NInput>
    </NModal>
    <NLayout class="h-screen box-border" position="absolute">
        <NLayoutHeader class="mx-2 mt-2 mb-4 overflow-hidden" style="height: 45px;">
            <div class="flex justify-between items-center">
                <NH1 class="mb-0">LAN-Share{{ electron ? '-Server' : '' }}</NH1>
                <NButtonGroup :size="sm ? 'medium' : 'small'" class="mr-4">
                    <NButton @click="() => theme = theme === 'light' ? 'dark' : 'light'">{{ theme }}</NButton>
                    <NButton @click="openGitHub">GitHub</NButton>
                    <NButton
                        v-if="electron"
                        @click="() => { electron && electron.send('appRelaunch', undefined) }"
                        type="warning"
                        ghost
                    >relaunch</NButton>
                </NButtonGroup>
            </div>
        </NLayoutHeader>

        <div class="flex items-center h-27" v-if="electron">
            <div class="flex max-w-1/1">
                <NInputGroup class="px-3">
                    <NInputGroupLabel style="min-width: 36px;">IP</NInputGroupLabel>
                    <NInput style="width: 240px;" v-model:value="ip"></NInput>
                    <NInputGroupLabel style="min-width: 52px;">Port</NInputGroupLabel>
                    <NInputNumber style="width: 240px;" :show-button="false" v-model:value="port"></NInputNumber>
                </NInputGroup>
                <!-- <NButton circle @click="restart">
                    <template #icon>
                        <NIcon size="18">
                            <i-el-refresh></i-el-refresh>
                        </NIcon>
                    </template>
                </NButton>-->
            </div>
            <NAlert class="mx-4" :type="isServing ? 'success' : 'info'">
                <span v-for="address in trueAddress">
                    {{ `${address.type === 'local' ? 'Local:&ensp;&ensp;&ensp;&ensp;' : 'Network:&ensp;'}${address.address.replace('127.0.0.1', 'localhost')}:${address.port}` }}
                    <br />
                </span>
                {{ isServing ? '' : 'Server has not started yet' }}
            </NAlert>
            <!-- <NButton type="warning" ghost class="m-2" v-if="isServing" @click="stop">stop server</NButton> -->
        </div>

        <div v-if="!isServing && electron" class="h-3/4 flex justify-center items-center">
            <NButton ghost type="primary" @click="openDir" size="large">Select or drop directory</NButton>
        </div>
        <div v-else>
            <div class="flex justify-between">
                <NButtonGroup :size="sm ? 'medium' : 'tiny'">
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
                <NButtonGroup :size="sm ? 'medium' : 'tiny'">
                    <NUpload
                        :file-list="uploadFileList"
                        @update-file-list="onUploadList"
                        abstract
                        :action="(electron ? `http://${ip}:${port}` : '') + '/upload'"
                        class="flex"
                        multiple
                        :data="{ dir: currentDir }"
                    >
                        <NUploadFileList class="z-1"></NUploadFileList>
                        <NUploadTrigger>
                            <NButton>upload</NButton>
                        </NUploadTrigger>
                    </NUpload>
                    <NButton @click="newFile">
                        <template #icon>
                            <NIcon>
                                <i-ant-design-file-add-filled></i-ant-design-file-add-filled>
                            </NIcon>
                        </template>
                    </NButton>
                    <NButton @click="newDir">
                        <template #icon>
                            <NIcon>
                                <AlarityDirectorySolid></AlarityDirectorySolid>
                            </NIcon>
                        </template>
                    </NButton>
                </NButtonGroup>
            </div>

            <div
                class="absolute bottom-4 left-0 right-0"
                :style="{ top: electron ? '224px' : sm ? '116px' : '98px' }"
            >
                <NLayoutContent class="h-full" v-show="!displayFile" :native-scrollbar="false">
                    <NMenu @update-value="onClickMenu" :options="menu"></NMenu>
                </NLayoutContent>
                <div v-show="displayFile" class="w-full h-full p-4 pt-0">
                    <img
                        v-show="displayImg"
                        class="max-h-full max-w-full m-auto absolute left-0 right-0 top-0 bottom-0"
                        :src="displayImg"
                    />
                    <div class="flex justify-end pb-1" v-show="!displayImg" @click="onClickEdit">
                        <NButton>{{ editMode ? 'save' : 'edit' }}</NButton>
                    </div>
                    <div v-show="!displayImg">
                        <NInput
                            :autosize="{ maxRows: 34 }"
                            :placeholder="''"
                            disabled
                            type="textarea"
                            v-if="!editMode"
                            :value="displayText"
                        ></NInput>
                        <NInput
                            :autosize="{ maxRows: 34 }"
                            type="textarea"
                            v-else
                            v-model:value="editText"
                        ></NInput>
                    </div>
                </div>
            </div>
        </div>
    </NLayout>
</template>
