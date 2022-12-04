import { Clock } from 'three'

class TaskManager {
    constructor() {
        let rAFID = 0
        this.tasks = []
        this.state = false
        this.clock = new Clock()
        this.later = []

        let rAF = () => {
            rAFID = requestAnimationFrame(rAF)
            if (!this.state) {
                return
            }
            let dt = this.clock.getDelta()
            //
            let ts = performance.now()
            this.tasks.forEach((t) => {
                t(this.state, dt)
            })

            let tick = 0
            for (let i = 0; i < this.later.length; i++) {
                let tsk = this.later.pop()
                if (typeof tsk === 'function') {
                    console.log('working')
                    tsk(this.state, dt)
                }
                tick = performance.now() - ts
                if (tick >= 5) {
                    break
                }
            }
        }
        rAFID = requestAnimationFrame(rAF)

        this.onLoop = (v) => {
            this.tasks.push(v)
        }
        this.onLater = (v) => {
            this.later.push(v)
        }

        this.clean = () => {
            this.later = []
            this.tasks = []
        }
    }
}

export const taskManager = new TaskManager()
