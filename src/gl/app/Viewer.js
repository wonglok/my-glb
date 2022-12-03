import { Object3D } from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
export class Viewer extends Object3D {
    constructor ({core}) {
        super()
        this.core = core

        this.loader = new GLTFLoader()
        this.draco = new DRACOLoader()
        this.draco.setPath('/draco/')
        this.loader.setDRACOLoader(this.draco)
     
        window.addEventListener('file-reading-done', ({ detail }) => {
            if (detail.fileData) {
                this.loader.parseAsync(detail.fileData.buffer).then((glb) => {
                    this.core.scene.add(glb.scene)
                })
            }
        });

        window.electronAPI.doneLoading('my-glb')
        //this.add(glb.scene)
        
    }
}