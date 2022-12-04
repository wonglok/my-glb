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
        width: 800,
        height: 600,
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

        let argsv = process.argv

        console.log(filePath)

        filePath = filePath || argsv[1]

        if (filePath && filePath !== '.') {
            fs.readFile(filePath, async (err, fileData) => {
                // console.log(err)

                win.webContents.send('file-reading-done', {
                    SAVED: 'File Saved',
                    err,
                    argsv,
                    filePath,
                    fileData: fileData,
                })
            })
        } else {
            let filePath = path.join(__dirname, `glb/demo.glb`)

            fs.readFile(filePath, (err, fileData) => {
                // console.log(err)

                win.webContents.send('file-reading-done', {
                    SAVED: 'File Saved',
                    err,
                    argsv,
                    filePath,
                    fileData: fileData,
                })
            })
        }
    })
}

let initOpenFileQueue = []

// Attempt to bind file opening #2
app.on('will-finish-launching', () => {
    // Event fired When someone drags files onto the icon while your app is running
    app.on('open-file', (event, file) => {
        if (app.isReady() === false) {
            initOpenFileQueue.push(file)
        } else {
            createWindow(file)
        }
        event.preventDefault()
    })
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    if (initOpenFileQueue.length) {
        initOpenFileQueue.forEach((file) => createWindow(file))
    } else {
        createWindow()
    }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
