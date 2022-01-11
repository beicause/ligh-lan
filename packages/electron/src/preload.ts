import { contextBridge, ipcRenderer } from 'electron'
import { server } from 'ligh-lan-cli'

const _electron: typeof server & {
  send: (channel: string, args: any[]) => void
} & { openDialog: (options: Electron.OpenDialogOptions) => Promise<string[]> } =
  server as any

_electron.send = (channel, args) => {
  ipcRenderer.send(channel, args)
}
_electron.openDialog = options => {
  ipcRenderer.send('openDialog', options)
  return new Promise(resolve =>
    ipcRenderer.on('openDialogReply', (_, args) => resolve(args))
  )
}

contextBridge.exposeInMainWorld('electron', _electron)
