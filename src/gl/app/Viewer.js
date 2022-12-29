import { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

import { webpTransform } from '../compressor/gltf-transform/webp'
import { Document, Scene, VertexLayout, WebIO } from '@gltf-transform/core'
import {
    ALL_EXTENSIONS,
    DracoMeshCompression,
} from '@gltf-transform/extensions'
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
        this.draco.setDecoderPath('./draco/')
        this.loader.setDRACOLoader(this.draco)

        window.addEventListener('file-reading-done', async ({ detail }) => {
            if (detail.fileData) {
                this.loader.parseAsync(detail.fileData.buffer).then((glb) => {
                    this.core.scene.clear()
                    this.core.scene.add(glb.scene)
                })

                let handler =
                    (res = 4096) =>
                    async () => {
                        let arrayBuffer = await detail.fileData.buffer

                        const io = new WebIO({ credentials: 'include' })

                        io.registerExtensions([...ALL_EXTENSIONS])

                        // ...

                        // let dracoMod = await import(
                        //     /* webpackIgnore: true */
                        //     '/draco/draco_decoder_raw.js'
                        // )
                        // let mod = dracoMod.DracoDecoderModule()

                        // io.registerExtensions([
                        //     DracoMeshCompression,
                        // ]).registerDependencies({
                        //     // 'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
                        //     // 'draco3d.encoder': mod, // Optional.
                        //     'draco3d.decoder': mod, // Optional.
                        // })

                        // io.setVertexLayout(VertexLayout.SEPARATE)

                        // Read.
                        let document

                        document = await io.readBinary(
                            new Uint8Array(arrayBuffer)
                        ) // Uint8Array → Document

                        dnd.innerHTML = `Remove Duplicate Buffers / Textures`
                        await document.transform(
                            // Remove duplicate vertex or texture data, if any.
                            dedup()
                        )

                        dnd.innerHTML = `Enable Instancing`
                        await document.transform(
                            // Remove duplicate vertex or texture data, if any.
                            instance()
                        )

                        dnd.innerHTML = `Remove Unused buffers`
                        await document.transform(
                            // Remove duplicate vertex or texture data, if any.
                            prune()
                        )

                        dnd.innerHTML = `Texture Reduction, may took a long time....`
                        await document.transform(
                            // Remove duplicate vertex or texture data, if any.
                            textureResize({ size: [res, res] })
                        )

                        // let hh = ({ detail }) => {
                        //     dnd.innerHTML = `Compression ${(detail * 100).toFixed(
                        //         3
                        //     )}%`
                        // }
                        // window.addEventListener('progress-notice', hh)
                        await document.transform(
                            // Remove duplicate vertex or texture data, if any.
                            // Remove unused nodes, textures, or other data.

                            // Losslessly resample animation frames.
                            // resample(),

                            // Resize all textures to ≤1K.

                            webpTransform({
                                //
                                onProgress: (p) => {
                                    dnd.innerHTML = `Compression ${(
                                        p * 100
                                    ).toFixed(1)}%`
                                },
                            })
                        )

                        const glb = await io.writeBinary(document) // Document → Uint8Array
                        dnd.innerHTML = `Compress and Download `

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
                            new Blob([glb.buffer], {
                                type: 'application/octet-stream',
                            })
                        )
                        /**
                         * Returns a hash code for a string.
                         * (Compatible to Java's String.hashCode())
                         *
                         * The hash code for a string object is computed as
                         *     s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]
                         * using number arithmetic, where s[i] is the i th character
                         * of the given string, n is the length of the string,
                         * and ^ indicates exponentiation.
                         * (The hash value of the empty string is zero.)
                         *
                         * @param {string} s a string
                         * @return {number} a hash code value for the given string.
                         */
                        let hashCode = function (s) {
                            var h = 0,
                                l = s.length,
                                i = 0
                            if (l > 0)
                                while (i < l)
                                    h = ((h << 5) - h + s.charCodeAt(i++)) | 0
                            return h
                        }
                        console.log(
                            'before',
                            arrayBuffer.byteLength,
                            'after',
                            glb.buffer.byteLength
                        )

                        let newFileName =
                            fileNameWithoutExt +
                            '-' +
                            hashCode(md5(glb.buffer.byteLength)) +
                            '.glb'

                        let an = window.document.createElement('a')
                        an.href = `${link}`
                        an.download = newFileName
                        an.target = '_blank'
                        an.click()
                        an.onclick = () => {
                            // window.removeEventListener('progress-notice', hh)
                        }
                    }

                //
                let domres = document.querySelectorAll('.compressanddownload')
                for (let i = 0; i < domres.length; i++) {
                    domres[i]?.remove()
                }

                let dnd = window.document.createElement('button')
                dnd.className = 'compressanddownload'
                dnd.style.position = 'fixed'
                dnd.style.top = '0px'
                dnd.style.left = '0px'
                dnd.style.display = 'block'
                dnd.style.zIndex = '30000'

                dnd.innerHTML = '4K WebP'

                dnd.onclick = handler(4096)
                window.document.body.appendChild(dnd)

                let dnd2 = window.document.createElement('button')
                dnd2.className = 'compressanddownload'
                dnd2.style.position = 'fixed'
                dnd2.style.top = '0px'
                dnd2.style.left = '80px'
                dnd2.style.display = 'block'
                dnd2.style.zIndex = '30000'

                dnd2.innerHTML = '2K WebP'

                dnd2.onclick = handler(2048)
                window.document.body.appendChild(dnd2)

                let dnd3 = window.document.createElement('button')
                dnd3.className = 'compressanddownload'
                dnd3.style.position = 'fixed'
                dnd3.style.top = '0px'
                dnd3.style.left = '160px'
                dnd3.style.display = 'block'
                dnd3.style.zIndex = '30000'

                dnd3.innerHTML = '1K WebP'

                dnd3.onclick = handler(1024)
                window.document.body.appendChild(dnd3)

                let dnd4 = window.document.createElement('button')
                dnd4.className = 'compressanddownload'
                dnd4.style.position = 'fixed'
                dnd4.style.top = '0px'
                dnd4.style.left = '250px'
                dnd4.style.display = 'block'
                dnd4.style.zIndex = '30000'

                dnd4.innerHTML = 'Half K WebP'

                dnd4.onclick = handler(1024)
                window.document.body.appendChild(dnd4)
            }
        })

        window.electronAPI.doneLoading('my-glb')
        //this.add(glb.scene)
    }
}
