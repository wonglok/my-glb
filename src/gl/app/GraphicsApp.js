import { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { taskManager } from "./TaskManager";
import { Viewer } from "./Viewer";
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
export class GraphicsApp {
    constructor () {
        this.gl = new WebGLRenderer({alpha: true,})
        this.scene = new Scene()
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 500)
        this.tm = taskManager
        this.tm.state = this
        document.querySelector('#root').appendChild(this.gl.domElement)

        this.tm.onLoop((st, dt) => {
            st.gl.render(this.scene, this.camera)
        })
        
        // 
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

