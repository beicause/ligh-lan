import { contextBridge, ipcRenderer } from 'electron'
import fs from 'fs'
import sirv from 'sirv'
import http from 'http'
import connect from 'connect'
import { join } from 'path'
import os from 'os'

let _server = null as http.Server | null

const _electron = {
  mkDir(path: string) {
    fs.mkdirSync(path)
  },
  readDir(path: string) {
    return fs.readdirSync(path)
  },
  readFile(path: string) {
    return fs.readFileSync(path).toString()
  },
  remove(path: string) {
    if (fs.statSync(path).isFile()) fs.unlinkSync(path)
    else {
      const files = fs.readdirSync(path)
      files.forEach(f => this.remove(f))
      fs.rmdirSync(path)
    }
  },
  isFile(path: string) {
    return fs.statSync(path).isFile()
  },
  async serveDir(
    path: string,
    port: number,
    hostname: string
  ): Promise<{ type: 'local' | 'network'; address: string; port: number }[]> {
    return new Promise(resolve => {
      const middleware = connect()
      _server = http.createServer(middleware)
      middleware.use(sirv(path))
      middleware.use(sirv(join(__dirname, './page')))

      _server.listen(port, hostname, () => {
        const address = Object.values(os.networkInterfaces())
          .flatMap(nInterface => nInterface ?? [])
          .filter(
            detail => detail && detail.address && detail.family === 'IPv4'
          )
          .map(detail => {
            const type: 'local' | 'network' = detail.address.includes(
              '127.0.0.1'
            )
              ? 'local'
              : 'network'
            return { type, address: detail.address, port }
          })
        return resolve(address)
      })
    })
  },
  async serveStop() {
    return new Promise(resolve => {
      _server?.close(() => resolve(undefined))
    })
  },
  copy(path: string, newPath: string) {
    fs.cpSync(path, newPath)
  },
  async openDialog(options: Electron.OpenDialogOptions): Promise<string[]> {
    ipcRenderer.send('openDialog', options)
    return new Promise(resolve =>
      ipcRenderer.on('openDialogReply', (_, args) => resolve(args))
    )
  }
}

contextBridge.exposeInMainWorld('electron', _electron)
