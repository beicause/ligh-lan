import fs from 'fs'
import sirv from 'sirv'
import connect from 'connect'
import os from 'os'
import http from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import formidable from 'formidable'
import * as p from 'path'
import chokidar from 'chokidar'

type FileNode =
  | { type: 'file'; path: string }
  | { type: 'dir'; path: string; children: FileNode[] }

let _server = null as http.Server | null
let _ws = null as WebSocketServer | null
let _fileInfo = null as FileNode | null

export const server = {
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
    root: string,
    port: number,
    hostname: string
  ): Promise<{ type: 'local' | 'network'; address: string; port: number }[]> {
    return new Promise((resolve, reject) => {
      _fileInfo = getRootDirInfo(root)
      const middleware = connect()
      middleware.use(
        sirv(root, {
          dotfiles: true,
          dev: true
        })
      )
      middleware.use(sirv(p.dirname(require.resolve('ligh-lan-webpage'))))
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
          server.remove(filepath)
          broadcast(JSON.stringify({ mode: 'resetFile' }))
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

        console.log(
          'server start',
          address.map(
            a =>
              `${a.type === 'local' ? 'Local:   ' : 'Network: '}http://${
                a.address
              }:${a.port}`
          )
        )

        resolve(address)
        _ws = new WebSocketServer({
          server: _server!
        })
        console.log('websocket server start: ', _ws.address())

        _ws.on('connection', (socket, req) => {
          sendFileInfo(socket)
          console.log('a client connect, ip: ', req.socket.remoteAddress)

          socket.on('message', buffer => {
            console.log(buffer.toString())
            const { mode, path, data } = JSON.parse(buffer.toString())

            switch (mode) {
              case 'delete':
                server.remove(path)
                break
              case 'mkFile':
                if (fs.existsSync(path))
                  broadcast(
                    JSON.stringify({
                      mode: 'ioe',
                      message: `file already exists, mkFile '${path}'`
                    })
                  )
                else server.writeFile(path, '')
                break
              case 'mkDir':
                server.mkDir(path)
                break
              case 'writeFile':
                server.writeFile(path, data)
            }
          })
        })

        const watcher = chokidar.watch(root, {
          ignoreInitial: true,
          disableGlobbing: true
        })
        const resetFileInfo = () => {
          _fileInfo = getRootDirInfo(root)
          sendFileInfo()
        }
        watcher.on('add', resetFileInfo)
        watcher.on('addDir', resetFileInfo)
        watcher.on('unlink', resetFileInfo)
        watcher.on('unlinkDir', resetFileInfo)
        watcher.on('change', () => {
          // writing file does not change the fileInfo, just broadcast it.
          broadcast(
            JSON.stringify({
              mode: 'fileWritten'
            })
          )
        })
      })
    })
  }
}

function sendFileInfo(socket?: WebSocket) {
  const data = JSON.stringify({
    mode: 'fileInfo',
    data: _fileInfo
  })
  if (socket) socket.send(data)
  else broadcast(data)
}

function sendError(e: Error) {
  broadcast(JSON.stringify({ mode: 'ioe', data: e.message }))
}

function broadcast(msg: string) {
  _ws?.clients.forEach(s => s.send(msg))
}

function getRootDirInfo(root: string): FileNode {
  const dirs: string[] = server.readDir(root)
  return {
    type: 'dir',
    path: root,
    children: dirs.map(_dir => {
      const dir = root + '/' + _dir
      if (server.isFile(dir)) return { type: 'file', path: dir }
      const children = server.readDir(dir).map((d: string) => dir + '/' + d) as
        | string[]
        | undefined
      if (!children || children.every(d => server.isFile(d)))
        return {
          type: 'dir',
          path: dir,
          children: children?.map(c => {
            return { type: 'file', path: c }
          })
        }
      return getRootDirInfo(dir)
    })
  } as FileNode
}
