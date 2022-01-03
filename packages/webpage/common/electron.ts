// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

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
      files.forEach(f => _electron.remove(f))
      fs.rmdirSync(path)
    }
  },
  async serveDir(
    path: string,
    port: number,
    hostname = '0.0.0.0'
  ): Promise<string[]> {
    return new Promise(resolve => {
      const middleware = connect()
      const server = http.createServer(middleware)
      middleware.use(sirv(path))
      server.listen(port, hostname, () => {
        const address = Object.values(os.networkInterfaces())
          .flatMap(nInterface => nInterface ?? [])
          .filter(
            detail => detail && detail.address && detail.family === 'IPv4'
          )
          .map(detail => {
            const type = detail.address.includes('127.0.0.1')
              ? 'Local:   '
              : 'Network: '
            const host = detail.address
            const url = `${host}:${port}`
            return `${type} ${url}`
          })
        return resolve(address)
      })
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
// @ts-check

export const electron: undefined | typeof _electron = window.electron
