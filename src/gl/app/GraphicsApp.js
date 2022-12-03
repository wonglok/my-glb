import { Color, EquirectangularReflectionMapping, PerspectiveCamera, Scene, sRGBEncoding, TextureLoader, WebGLRenderer } from "three";
import { taskManager } from "./TaskManager";
import { Viewer } from "./Viewer";
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
export class GraphicsApp {
    constructor () {
        this.gl = new WebGLRenderer({alpha: true,})
        window.addEventListener('resize', () => {
            this.gl.setSize(window.innerWidth, window.innerHeight, true)
        })
        window.dispatchEvent(new CustomEvent('resize'))
        //
        this.scene = new Scene()

        new TextureLoader().load(`./hdri/brown_photostudio_05_1k.hdr`, (t) => {
            t.encoding = sRGBEncoding
            t.mapping = EquirectangularReflectionMapping
            this.scene.background = new Color('#ffffff')
            this.scene.environment = t
        })

        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 500)
        this.tm = taskManager
        this.tm.state = this
        document.querySelector('#root').appendChild(this.gl.domElement)

        this.tm.onLoop((st, dt) => {
            st.gl.render(this.scene, this.camera)
        })
        
        this.scene.add(new Viewer({ core: this }))

        this.orbit = new OrbitControls(this.camera, this.gl.domElement)
        this.orbit.object.position.z = 10
        this.orbit.enableDamping = true
        this.orbit.rotateSpeed = 1.3
        this.tm.onLoop(() => {
            this.orbit.update()
        })


        //
    }
}

