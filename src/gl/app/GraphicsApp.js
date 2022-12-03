import { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { taskManager } from "./TaskManager";
import { Viewer } from "./Viewer";

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

        this.scene.add(new Viewer({ core: this }))
        
    }
}

