import { contextBridge, ipcRenderer } from 'electron'
import fs from 'fs'
import sirv from 'sirv'
import connect from 'connect'
import { join } from 'path'
import os from 'os'
import http from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import formidable from 'formidable'

let _server = null as http.Server | null
let _ws = null as WebSocketServer | null
let fileInfo = ''

const _electron = {
  mkDir(path: string) {
    try {
      fs.mkdirSync(path)
    } catch (e: any) {
      console.log(e)
      sendError(e)
    }
  },
  readDir(path: string) {
    return fs.readdirSync(path)
  },
  readFile(path: string) {
    return fs.readFileSync(path).toString()
  },
  writeFile(path: string, data: string) {
    try {
      fs.writeFileSync(path, data)
    } catch (e: any) {
      console.log(e)
      sendError(e)
    }
  },
  remove(path: string) {
    if (!fs.existsSync(path)) return
    fs.rmSync(path, { recursive: true })
  },
  isFile(path: string) {
    return fs.statSync(path).isFile()
  },
  async serveDir(
    path: string,
    port: number,
    hostname: string
  ): Promise<{ type: 'local' | 'network'; address: string; port: number }[]> {
    return new Promise((resolve, reject) => {
      const middleware = connect()
      middleware.use(
        sirv(path, {
          dotfiles: true,
          dev: true
        })
      )
      middleware.use(sirv(join(__dirname, './page')))
      middleware.use('/upload', (req, res, next) => {
        const form = formidable()
        form.parse(req, (err, fields, files) => {
          if (err || typeof fields.dir !== 'string') {
            res.writeHead(400)
            res.end()
            next()
            return
          }
          const dir = fields.dir
          const { originalFilename, filepath } = files.file as formidable.File
          fs.copyFileSync(filepath, dir + '/' + originalFilename)
          _electron.remove(filepath)
          ipcRenderer.send('resetFile')
          res.writeHead(200)
          res.end()
          next()
        })
      })
      _server = http.createServer(middleware)
      const onError = (e: Error & { code?: string }) => {
        if (e.code === 'EADDRINUSE') {
          _server!.removeListener('error', onError)
          reject(new Error(`Port ${port} is already in use`))
        } else {
          _server!.removeListener('error', onError)
          reject(e)
        }
      }
      _server.addListener('error', onError)
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
        _server!.removeListener('error', onError)
        resolve(address)
        _ws = new WebSocketServer({
          server: _server!
        })
        console.log('websocket server start', _ws.address())

        _ws.on('connection', (socket, req) => {
          sendFileInfo(socket)
          console.log('on connection')

          socket.on('message', buffer => {
            console.log(buffer.toString())
            const { mode, path, data } = JSON.parse(buffer.toString())

            switch (mode) {
              case 'delete':
                _electron.remove(path)
                ipcRenderer.send('resetFile')
                break
              case 'mkFile':
                if (fs.existsSync(path))
                  ipcRenderer.send(
                    'ioe',
                    `file already exists, mkFile '${path}'`
                  )
                else _electron.writeFile(path, '')
                ipcRenderer.send('resetFile')
                break
              case 'mkDir':
                _electron.mkDir(path)
                ipcRenderer.send('resetFile')
                break
              case 'writeFile':
                _electron.writeFile(path, data)
                _ws?.clients.forEach(s => {
                  s.send(
                    JSON.stringify({
                      mode: 'fileWritten'
                    })
                  )
                })
            }
          })
        })
      })
    })
  },
  // async serveStop() {
  //   return new Promise(resolve => {
  //     fileInfo = ''
  //     _ws?.clients.forEach(s => s.close())
  //     _ws?.close(() => {
  //       _server?.close(() => resolve(undefined))
  //     })
  //   })
  // },
  async openDialog(options: Electron.OpenDialogOptions): Promise<string[]> {
    ipcRenderer.send('openDialog', options)
    return new Promise(resolve =>
      ipcRenderer.on('openDialogReply', (_, args) => resolve(args))
    )
  },
  send(channel: string, args: any) {
    ipcRenderer.send(channel, args)
  },
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  on(channel: string, callback: (args: any) => void) {
    ipcRenderer.on(channel, (event, args) => callback(args))
  }
}
ipcRenderer.on('fileInfoReply', (e, args) => {
  fileInfo = args
  console.log('update file info')
})
ipcRenderer.on('resetFileCompleteReply', () => {
  _ws?.clients.forEach(socket => {
    console.log('send to client')

    sendFileInfo(socket)
  })
})
function sendFileInfo(socket: WebSocket) {
  socket.send(
    JSON.stringify({
      mode: 'fileInfo',
      data: fileInfo
    })
  )
}

function sendError(e: Error) {
  _ws?.clients.forEach(s => {
    s.send(JSON.stringify({ mode: 'ioe', message: e.message }))
  })
}
contextBridge.exposeInMainWorld('electron', _electron)
