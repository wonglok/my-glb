import {
    Color,
    EquirectangularReflectionMapping,
    Object3D,
    PerspectiveCamera,
    Scene,
    sRGBEncoding,
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
        document.querySelector('#root').appendChild(this.gl.domElement)

        this.scene = new Scene()

        this.camera = new PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        )

        this.scene.add(new Viewer({ core: this }))

        //
        this.setupLoop()
        this.setupLabel()
        this.setupResizer()
        this.setupControls()
        this.setupLightingAndColor()
        this.tm.onLoop((st, dt) => {
            st.gl.render(this.scene, this.camera)
        })
    }
    setupLoop() {
        this.tm = taskManager
        this.tm.state = this
    }
    setupLabel() {
        let label = document.createElement('div')
        label.style.display = `block`
        label.style.position = `absolute`
        label.style.bottom = `0px`
        label.style.right = `0px`
        label.style.zIndex = `100`
        label.innerHTML =
            'Use WASD to walk around, Drag to Rotate, QE to float and sink'

        label.style.padding = `3px 15px`
        label.style.background = `white`
        label.style.font = `15px`
        document.body.appendChild(label)
    }
    setupResizer() {
        window.addEventListener('resize', () => {
            this.gl.setSize(window.innerWidth, window.innerHeight, true)
            this.gl.setPixelRatio(window.devicePixelRatio || 1.0)
            this.camera.aspect = window.innerWidth / window.innerHeight
            this.camera.updateProjectionMatrix()
        })
        window.dispatchEvent(new CustomEvent('resize'))
    }
    setupLightingAndColor() {
        this.gl.outputEncoding = sRGBEncoding
        this.gl.physicallyCorrectLights = true

        new RGBELoader().load(`./hdri/greenwich_park_02_1k.hdr`, (t) => {
            t.mapping = EquirectangularReflectionMapping
            this.scene.background = new Color('#ffffff')
            this.scene.environment = t
        })
    }
    setupControls() {
        this.orbit = new OrbitControls(this.camera, this.gl.domElement)
        this.orbit.enableDamping = false

        this.player = new Object3D()
        this.chaseTarget = new Object3D()

        this.camera.position.z = 5
        this.player.position.z = 5
        this.chaseTarget.position.z = 5
        this.orbit.minDistance = 0
        this.orbit.maxDistance = 0.000001

        this.reset = () => {
            if (this.controlMode === 'first-person') {
                this.orbit.minDistance = 0
                this.orbit.maxDistance = 0.0001
                this.orbit.rotateSpeed = -0.9
                this.orbit.update()
            } else if (this.controlMode === 'orbit-mode') {
                this.orbit.minDistance = 5
                this.orbit.maxDistance = Infinity
                this.orbit.rotateSpeed = 0.9
                this.orbit.update()
                this.orbit.minDistance = 0
            }
        }
        this.controlMode = 'first-person'
        this.reset()

        let btn1 = document.createElement('button')
        btn1.onclick = () => {
            this.controlMode = 'first-person'
            this.reset()
        }
        btn1.innerHTML = 'Walk Mode'

        let btn2 = document.createElement('button')
        btn2.onclick = () => {
            this.controlMode = 'orbit-mode'
            this.reset()
        }
        btn2.innerHTML = 'Orbit Mode'

        let topRight = document.createElement('div')
        topRight.style.position = 'absolute'
        topRight.style.top = '0px'
        topRight.style.right = '0px'
        topRight.style.zIndex = '1000'

        topRight.appendChild(btn1)
        topRight.appendChild(btn2)
        document.body.appendChild(topRight)

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
                this.chaseTarget.position.addScaledVector(delta3, dt * 10.0)
            }
            if (this.keyboardDown.s) {
                delta3.set(0, 0, 1)
                delta3.applyAxisAngle(up, this.orbit.getAzimuthalAngle())
                this.chaseTarget.position.addScaledVector(delta3, dt * 10.0)
            }
            if (this.keyboardDown.a) {
                delta3.set(-1, 0, 0)
                delta3.applyAxisAngle(up, this.orbit.getAzimuthalAngle())
                this.chaseTarget.position.addScaledVector(delta3, dt * 10.0)
            }
            if (this.keyboardDown.d) {
                delta3.set(1, 0, 0)
                delta3.applyAxisAngle(up, this.orbit.getAzimuthalAngle())
                this.chaseTarget.position.addScaledVector(delta3, dt * 10.0)
            }

            if (this.keyboardDown.e) {
                delta3.set(0, 1, 0)
                delta3.applyAxisAngle(up, this.orbit.getAzimuthalAngle())
                this.chaseTarget.position.addScaledVector(
                    delta3,
                    dt * 15.5 * 0.3
                )
            }
            if (this.keyboardDown.q) {
                delta3.set(0, -1, 0)
                delta3.applyAxisAngle(up, this.orbit.getAzimuthalAngle())
                this.chaseTarget.position.addScaledVector(
                    delta3,
                    dt * 15.5 * 0.3
                )
            }
        })

        let wheel = new WheelGesture(this.gl.domElement, (ev) => {
            if ((this.controlMode = 'first-person')) {
                this.camera.fov += ev.delta[1] / 100
                this.camera.updateProjectionMatrix()
            }
        })
    }
}
