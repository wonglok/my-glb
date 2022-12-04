const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('electronAPI', {
    doneLoading: (title) => {
        ipcRenderer.send('done-loading', title)
    },
})

ipcRenderer.on('file-reading-done', function (evt, message) {
    console.log('preload', message) // Returns: {'SAVED': 'File Saved'}

    window.dispatchEvent(
        new CustomEvent('file-reading-done', { detail: message })
    )
})

ipcRenderer.on('optimised-glb', function (evt, message) {
    console.log('preload, optimised-glb', message) // Returns: {'SAVED': 'File Saved'}

    window.dispatchEvent(new CustomEvent('optimised-glb', { detail: message }))
})
