const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    doneLoading: (title) => {
        ipcRenderer.send('done-loading', title)
    }
})

ipcRenderer.on('file-reading-done', function (evt, message) {
    console.log(message); // Returns: {'SAVED': 'File Saved'}


    
});