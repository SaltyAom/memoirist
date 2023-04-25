'use strict'

import { hrtime } from 'process'

const operations = 1000000

function now() {
    var ts = hrtime()

    return ts[0] * 1e3 + ts[1] / 1e6
}

function getOpsSec(ms: number) {
    return Number(((operations * 1000) / ms).toFixed()).toLocaleString()
}

function print(name: string, time: number) {
    console.log(name, getOpsSec(now() - time), 'ops/sec')
}

function title(name: string) {
    console.log(
        `${'='.repeat(name.length + 2)}
 ${name}
${'='.repeat(name.length + 2)}`
    )
}

class Queue {
    q: Function[] = []
    running: boolean = false

    add(job: Function) {
        this.q.push(job)
        if (!this.running) this.run()
    }

    run() {
        this.running = true
        const job = this.q.shift()

        if (job)
            job(() => {
                if (this.q.length) {
                    this.run()
                } else {
                    this.running = false
                }
            })
    }
}

export { now, getOpsSec, print, title, Queue, operations }
