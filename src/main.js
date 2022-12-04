const { app, BrowserWindow, ipcMain, ipcRenderer } = require('electron')
const path = require('path')
const fs = require('fs')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit()
}

const createWindow = (filePath = false) => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1024,
        height: 800,
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        },
    })

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools()
    }

    ipcMain.on('done-loading', async (event, title) => {
        const webContents = event.sender
        const win = BrowserWindow.fromWebContents(webContents)
        win.setTitle(title)

        if (filePath && filePath !== '.') {
            fs.readFile(filePath, async (err, fileData) => {
                win.webContents.send('file-reading-done', {
                    SAVED: 'File Saved',
                    err,
                    filePath,
                    fileData: fileData,
                })
            })
        } else {
            // default file
            let filePath = path.join(__dirname, `glb/demo.glb`)
            fs.readFile(filePath, (err, fileData) => {
                win.webContents.send('file-reading-done', {
                    SAVED: 'File Saved',
                    err,
                    filePath,
                    fileData: fileData,
                })
            })
        }
    })
}

// // // Attempt to bind file opening #2
app.on('will-finish-launching', () => {
    if (process.platform === 'darwin') {
        app.on('open-file', (event, file) => {
            event.preventDefault()

            let tt = setInterval(() => {
                if (app.isReady()) {
                    clearInterval(tt)
                    createWindow(file)
                }
            }, 0)
        })
    }
})

// // This method will be called when Electron has finished
// // initialization and is ready to create browser windows.
// // Some APIs can only be used after this event occurs.
app.on('ready', () => {
    let argsv = process.argv
    let url = argsv[1]

    if (url) {
        createWindow(url)
    }
    // if (url) {
    //     initOpenFileQueue = url
    // }

    // let tt = setInterval(() => {
    //     if (initOpenFileQueue) {
    //         clearInterval(tt)
    //         createWindow(initOpenFileQueue)
    //     }
    // })

    // if (initOpenFileQueue) {
    //     createWindow(initOpenFileQueue)
    //     initOpenFileQueue = ''
    // } else {
    // }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    app.quit()
    // if (process.platform === 'darwin') {
    // }
})

// app.on('activate', () => {
//     // On OS X it's common to re-create a window in the app when the
//     // dock icon is clicked and there are no other windows open.
//     if (
//         process.platform === 'darwin' &&
//         BrowserWindow.getAllWindows().length === 0
//     ) {
//         // createWindow()
//         app.quit()
//     }
// })

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
