import {
    Color,
    EquirectangularReflectionMapping,
    Object3D,
    PerspectiveCamera,
    Scene,
    sRGBEncoding,
    TextureLoader,
    Vector3,
    WebGLRenderer,
} from 'three'
import { taskManager } from './TaskManager'
import { Viewer } from './Viewer'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { WheelGesture } from '@use-gesture/vanilla'

export class GraphicsApp {
    constructor() {
        this.gl = new WebGLRenderer({ alpha: true })
        this.scene = new Scene()
        this.camera = new PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            1,
            500
        )

        window.addEventListener('resize', () => {
            this.gl.setSize(window.innerWidth, window.innerHeight, true)
            this.gl.setPixelRatio(window.devicePixelRatio || 1.0)
            this.camera.aspect = window.innerWidth / window.innerHeight
            this.camera.updateProjectionMatrix()
        })
        window.dispatchEvent(new CustomEvent('resize'))
        //

        new RGBELoader().load(`./hdri/greenwich_park_02_1k.hdr`, (t) => {
            t.mapping = EquirectangularReflectionMapping
            this.scene.background = new Color('#ffffff')
            this.scene.environment = t
        })

        this.tm = taskManager
        this.tm.state = this
        document.querySelector('#root').appendChild(this.gl.domElement)

        this.tm.onLoop((st, dt) => {
            st.gl.render(this.scene, this.camera)
        })

        this.scene.add(new Viewer({ core: this }))

        this.orbit = new OrbitControls(this.camera, this.gl.domElement)
        this.orbit.enableDamping = true
        this.orbit.rotateSpeed = 1.3
        this.orbit.minDistance = 0
        this.orbit.maxDistance = 0.000001
        this.orbit.rotateSpeed = -1
        this.camera.position.z = 20
        this.player = new Object3D()
        this.chaseTarget = new Object3D()
        this.player.position.z = 15
        this.chaseTarget.position.z = 15
        this.tm.onLoop(() => {
            this.player.position.lerp(this.chaseTarget.position, 0.1)
            this.orbit.update()
            this.orbit.target.y -= 1.7
            this.camera.position.sub(this.orbit.target)
            this.orbit.target.copy(this.player.position)
            this.camera.position.add(this.player.position)
            this.orbit.target.y += 1.7
        })

        this.keyboardDown = {}
        window.addEventListener('keydown', (ev) => {
            this.keyboardDown[ev.key] = true
        })
        window.addEventListener('keyup', (ev) => {
            this.keyboardDown[ev.key] = false
        })
        let delta3 = new Vector3()
        let up = new Vector3(0, 1, 0)
        this.tm.onLoop((st, dt) => {
            if (this.keyboardDown.w) {
                delta3.set(0, 0, -1)
                delta3.applyAxisAngle(up, this.orbit.getAzimuthalAngle())
                this.chaseTarget.position.addScaledVector(delta3, dt * 15.5)
            }
            if (this.keyboardDown.s) {
                delta3.set(0, 0, 1)
                delta3.applyAxisAngle(up, this.orbit.getAzimuthalAngle())
                this.chaseTarget.position.addScaledVector(delta3, dt * 15.5)
            }
            if (this.keyboardDown.a) {
                delta3.set(-1, 0, 0)
                delta3.applyAxisAngle(up, this.orbit.getAzimuthalAngle())
                this.chaseTarget.position.addScaledVector(delta3, dt * 15.5)
            }
            if (this.keyboardDown.d) {
                delta3.set(1, 0, 0)
                delta3.applyAxisAngle(up, this.orbit.getAzimuthalAngle())
                this.chaseTarget.position.addScaledVector(delta3, dt * 15.5)
            }

            if (this.keyboardDown.e) {
                delta3.set(0, 1, 0)
                delta3.applyAxisAngle(up, this.orbit.getAzimuthalAngle())
                this.chaseTarget.position.addScaledVector(delta3, dt * 15.5)
            }
            if (this.keyboardDown.q) {
                delta3.set(0, -1, 0)
                delta3.applyAxisAngle(up, this.orbit.getAzimuthalAngle())
                this.chaseTarget.position.addScaledVector(delta3, dt * 15.5)
            }
        })

        let wheel = new WheelGesture(this.gl.domElement, (ev) => {
            console.log(ev)

            this.camera.fov += ev.delta[1] / 100
            this.camera.updateProjectionMatrix()
        })

        //
    }
}
