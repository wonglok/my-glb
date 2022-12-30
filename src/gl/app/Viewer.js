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
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter'
export class Viewer extends Object3D {
    constructor({ core }) {
        super()
        this.core = core

        this.loader = new GLTFLoader()
        this.draco = new DRACOLoader()
        this.draco.setDecoderPath('./draco/')
        this.loader.setDRACOLoader(this.draco)

        let done = false
        window.addEventListener('file-reading-done', async ({ detail }) => {
            if (done) {
                return
            }
            done = true

            //
            if (detail.fileData) {
                let myGLB = await this.loader
                    .parseAsync(detail.fileData.buffer)
                    .then((glb) => {
                        this.core.scene.clear()
                        this.core.scene.add(glb.scene)

                        return glb
                    })

                let progressDiv = document.createElement('button')
                document.body.appendChild(progressDiv)
                progressDiv.style.cssText = `
                        position: absolute;
                        top: 0px;
                        left: 50%;
                    `
                progressDiv.innerText = `Status: Ready`

                let handler =
                    (res = 4096, enablAnimations = false) =>
                    async () => {
                        // let arrayBufferRaw = await detail.fileData.raw

                        // let loader = new GLTFLoader()
                        // let draco = new DRACOLoader()
                        // draco.setDecoderPath('./draco/')
                        // loader.setDRACOLoader(draco)

                        // let glbObj = await loader.parseAsync(arrayBufferRaw)

                        let exporter = new GLTFExporter()

                        progressDiv.innerHTML = `reforming...`

                        let arrayBufferFromThreeLoader = await new Promise(
                            (resolve, reject) => {
                                exporter.parse(
                                    myGLB.scene.children,
                                    (binary) => {
                                        resolve(binary)
                                    },
                                    () => {},
                                    {
                                        binary: true,
                                        animations: enablAnimations
                                            ? myGLB.animations
                                            : undefined,
                                    }
                                )
                            }
                        )

                        // console.log(arrayBufferFromThreeLoader)

                        let arrayBufferForTransfrom = arrayBufferFromThreeLoader

                        let arrayBuffer = arrayBufferForTransfrom
                        const io = new WebIO({ credentials: 'include' })

                        io.registerExtensions([...ALL_EXTENSIONS])

                        // ...
                        progressDiv.innerHTML = `loading draco...`

                        let dracoMod = await import(
                            /* webpackIgnore: true */
                            './draco/draco_encoder_raw.js'
                        )
                        let mod = dracoMod.DracoEncoderModule()

                        io.registerExtensions([
                            DracoMeshCompression,
                        ]).registerDependencies({
                            // 'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
                            'draco3d.encoder': mod, // Optional.
                            // 'draco3d.decoder': mod, // Optional.
                        })

                        // io.setVertexLayout(VertexLayout.SEPARATE)

                        // Read.
                        let document
                        progressDiv.innerHTML = `reading...`

                        document = await io.readBinary(
                            new Uint8Array(arrayBuffer)
                        ) // Uint8Array → Document

                        progressDiv.innerHTML = `Remove Duplicate Buffers / Textures`
                        await document.transform(
                            // Remove duplicate vertex or texture data, if any.
                            dedup()
                        )

                        if (!enablAnimations) {
                            progressDiv.innerHTML = `Enable Instancing`
                            await document.transform(
                                // Remove duplicate vertex or texture data, if any.
                                instance()
                            )
                        }

                        progressDiv.innerHTML = `Remove Unused buffers`
                        await document.transform(
                            // Remove duplicate vertex or texture data, if any.
                            prune()
                        )

                        progressDiv.innerHTML = `Texture Reduction, may took a long time....`
                        await document.transform(
                            // Remove duplicate vertex or texture data, if any.
                            textureResize({ size: [res, res] })
                        )

                        // let hh = ({ detail }) => {
                        //     progressDiv.innerHTML = `Compression ${(detail * 100).toFixed(
                        //         3
                        //     )}%`
                        // }
                        progressDiv.innerHTML = `webp`
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
                                    progressDiv.innerHTML = `Compression ${(
                                        p * 100
                                    ).toFixed(1)}%`
                                },
                            })
                        )
                        progressDiv.innerHTML = `compress draco`

                        await document
                            .createExtension(DracoMeshCompression)
                            .setRequired(true)
                            .setEncoderOptions({
                                method: DracoMeshCompression.EncoderMethod
                                    .SEQUENTIAL,
                                encodeSpeed: 5,
                                decodeSpeed: 5,
                            })

                        const glb = await io.writeBinary(document) // Document → Uint8Array
                        progressDiv.innerHTML = `Status: Ready`

                        function basename(path) {
                            return path.replace(/\\/g, '/').replace(/.*\//, '')
                        }

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

                let dndp = document.createElement('div')
                dndp.className = 'compressanddownload'
                dndp.style.position = 'fixed'
                dndp.style.top = '0px'
                dndp.style.left = '0px'
                dndp.style.zIndex = '30000'
                window.document.body.appendChild(dndp)

                let reso = window.document.createElement('select')
                reso.style.display = 'inline-block'
                reso.innerHTML = `

                <option value="4096" selected> 4K Texture</option>
                <option value="2048"> 2K Texture</option>
                <option value="1024"> 1K Texture</option>
                <option value="512">0.5K Texture</option>
                `
                dndp.appendChild(reso)

                let animationOrNot = window.document.createElement('select')
                animationOrNot.style.display = 'inline-block'
                animationOrNot.innerHTML = `
                <option value="false" selected> No Anim, yes Instnacing</option>
                <option value="true"> Yes Anim, no instancing</option>
                `
                dndp.appendChild(animationOrNot)

                let dnd = window.document.createElement('button')
                dnd.className = 'compressanddownload'
                dnd.style.display = 'inline-block'
                dnd.style.zIndex = '30000'
                dnd.innerHTML = 'Compress'
                dndp.appendChild(dnd)

                dnd.onclick = () => {
                    let imgRes = reso.value
                    let enableAnim = animationOrNot.value
                    handler(imgRes, enableAnim)()
                }
            }
        })

        window.electronAPI.doneLoading('my-glb')
        //this.add(glb.scene)
    }
}
