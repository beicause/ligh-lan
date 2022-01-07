import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeTheme,
  shell
} from 'electron'
import * as path from 'path'

const page = path.join(__dirname, './page')
let mainWindow = null as null | BrowserWindow
function createWindow() {
  mainWindow = new BrowserWindow({
    height: 900,
    width: 1300,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !process.env.ELECTRON_PAGE_DEBUG
    }
  })
  if (process.env.LIGH_LAN_SERVER_DEBUG)
    mainWindow.loadURL('http://localhost:3000/')
  else mainWindow.loadFile(path.join(page, 'index.html'))
  if (process.env.LIGH_LAN_DEV_TOOLS) mainWindow.webContents.openDevTools()
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

app.applicationMenu = null
nativeTheme.themeSource = 'dark'

ipcMain.on('openDialog', (event, options: Electron.OpenDialogOptions) => {
  dialog
    .showOpenDialog(options)
    .then(res => {
      event.reply('openDialogReply', res.filePaths)
    })
    .catch(err => console.log(err))
})

ipcMain.on('resetFile', e => {
  e.reply('resetFileReply')
})

ipcMain.on('fileInfo', (e, args) => {
  e.reply('fileInfoReply', args)
})
ipcMain.on('resetFileComplete', e => {
  e.reply('resetFileCompleteReply')
})

ipcMain.on('appRelaunch', () => {
  app.relaunch()
  app.quit()
})

ipcMain.on('openBrowser', (e, args) => {
  shell.openExternal(args)
})
