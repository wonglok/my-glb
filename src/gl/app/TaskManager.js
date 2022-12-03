import { Clock } from "three"

class TaskManager {
    constructor () {
        let rAFID = 0
        this.tasks = []
        this.st = false
        this.clock = new Clock()
        this.later = []
       
        let rAF = () => {
            let dt = this.clock.getDelta()
            //
            rAFID = requestAnimationFrame(rAF)
            let ts = performance.now()
            this.tasks.forEach((t) => {t(this.st, dt)})  
            
            let tick = 0
            for (let i = 0; i < this.later.length; i++) {
                let tsk = this.later.pop()
                if (typeof tsk === 'function') {
                    console.log('working')
                    tsk(this.st, dt)
                }
                tick = performance.now() - ts
                if (tick >= 5) {
                    break;
                }
            }
        }
        rAFID = requestAnimationFrame(rAF)

        this.onLoop = ((v) => {
            this.tasks.push(v)
        })
        this.onLater = ((v) => {
            this.later.push(v)
        })

        this.clean = () => {
            this.later = []
            this.tasks = []
        }
    }
}

export const taskManager = new TaskManager()