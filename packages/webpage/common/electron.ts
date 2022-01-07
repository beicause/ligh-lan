// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// for type hints

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
  writeFile(path: string, data: string) {
    fs.writeFileSync(path, data)
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
      middleware.use(sirv(path))
      middleware.use(sirv(join(__dirname, './page')))
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
          socket.on('message', buffer => {
            const { mode, path, data } = JSON.parse(buffer.toString())
            switch (mode) {
              case 'delete':
                _electron.remove(path)
                ipcRenderer.send('resetFile')
                break
              case 'mkFile':
                _electron.writeFile(path, data)
                ipcRenderer.send('resetFile')
                break
              case 'mkDir':
                _electron.mkDir(path)
                ipcRenderer.send('resetFile')
                break
            }
          })
        })
      })
    })
  },
  async serveStop() {
    return new Promise(resolve => {
      _ws?.clients.forEach(s => s.close())
      _ws?.close(() => {
        _server?.close(() => resolve(undefined))
      })
    })
  },
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
// @ts-check

export const electron: undefined | typeof _electron = window.electron
