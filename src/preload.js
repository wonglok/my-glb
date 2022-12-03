const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    doneLoading: (title) => {
        ipcRenderer.send('done-loading', title)
    }
})

ipcRenderer.on('file-reading-done', function (evt, message) {
    console.log('preload', message); // Returns: {'SAVED': 'File Saved'}   

    window.dispatchEvent(new CustomEvent('file-reading-done', {detail: message}))
    
});