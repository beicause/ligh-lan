import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  ipcRenderer,
  nativeTheme
} from 'electron'
import * as path from 'path'
import fs from 'fs'

const page = path.join(__dirname, './page')
let mainWindow = null as null | BrowserWindow
function createWindow() {
  mainWindow = new BrowserWindow({
    height: 900,
    width: 1300,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  if (process.env.ELECTRON_PAGE_DEBUG)
    mainWindow.loadURL('http://localhost:3000/')
  else mainWindow.loadFile(path.join(page, 'index.html'))
  mainWindow.webContents.openDevTools()
}

app.on('ready', () => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

let tmpFile = ''

app.on('before-quit', () => {
  tmpFile && fs.rmSync(tmpFile)
})
ipcMain.on('tmpFile', (event, args) => {
  tmpFile = args
})

nativeTheme.themeSource = 'dark'
ipcMain.on('openDialog', (event, options: Electron.OpenDialogOptions) => {
  dialog
    .showOpenDialog(options)
    .then(res => {
      event.reply('openDialogReply', res.filePaths)
    })
    .catch(err => console.log(err))
})
