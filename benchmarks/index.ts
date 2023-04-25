import { readdirSync } from 'fs'

readdirSync(`${import.meta.dir}/libs`)
    .sort((a, b) => a.localeCompare(b))
    .forEach(async (file) => {
        const process = await Bun.spawnSync(['bun', `libs/${file}`], {
            cwd: import.meta.dir,
            stdout: 'pipe'
        })

        console.log(process.stdout?.toString())
    })
