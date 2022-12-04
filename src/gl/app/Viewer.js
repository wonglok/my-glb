import { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

import { webpTransform } from '../compressor/gltf-transform/webp'
import { Document, Scene, VertexLayout, WebIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import {
    dedup,
    instance,
    prune,
    textureResize,
} from '@gltf-transform/functions'
import md5 from 'md5'
export class Viewer extends Object3D {
    constructor({ core }) {
        super()
        this.core = core

        this.loader = new GLTFLoader()
        this.draco = new DRACOLoader()
        this.draco.setPath('/draco/')
        this.loader.setDRACOLoader(this.draco)

        window.addEventListener('file-reading-done', async ({ detail }) => {
            if (detail.fileData) {
                this.loader.parseAsync(detail.fileData.buffer).then((glb) => {
                    this.core.scene.add(glb.scene)
                })

                let arrayBuffer = await detail.fileData.buffer

                const io = new WebIO({ credentials: 'include' })

                io.registerExtensions([...ALL_EXTENSIONS])
                io.setVertexLayout(VertexLayout.SEPARATE)

                // Read.
                let document

                document = await io.readBinary(new Uint8Array(arrayBuffer)) // Uint8Array → Document

                await document.transform(
                    // Remove duplicate vertex or texture data, if any.
                    dedup(),

                    instance(),

                    // Remove unused nodes, textures, or other data.
                    prune(),

                    // Losslessly resample animation frames.
                    // resample(),

                    // Resize all textures to ≤1K.
                    textureResize({ size: [2048, 2048] }),

                    webpTransform({})
                )

                // Write.
                const glb = await io.writeBinary(document) // Document → Uint8Array

                function basename(path) {
                    return path.replace(/\\/g, '/').replace(/.*\//, '')
                }

                console.log()

                let arr = basename(detail.filePath).split('.')
                arr.pop()
                let fileNameWithoutExt = arr.join('.')

                console.log(fileNameWithoutExt)
                //
                const link = URL.createObjectURL(
                    new Blob([glb.buffer], { type: 'application/octet-stream' })
                )

                console.log(
                    'before',
                    arrayBuffer.byteLength,
                    'after',
                    glb.buffer.byteLength
                )

                let newFileName =
                    fileNameWithoutExt +
                    '-' +
                    md5(glb.buffer.byteLength) +
                    '.glb'
                //

                //

                let dnd = window.document.createElement('a')
                dnd.style.position = 'fixed'
                dnd.style.top = '0px'
                dnd.style.left = '0px'
                dnd.style.display = 'block'
                dnd.style.zIndex = '30000'

                dnd.innerText = 'donwload-optimised'
                dnd.download = newFileName

                dnd.href = link
                dnd.target = '_blank'

                window.document.body.appendChild(dnd)
            }
        })

        window.electronAPI.doneLoading('my-glb')
        //this.add(glb.scene)
    }
}
