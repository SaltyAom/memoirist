import { Memoirist } from '../src'

const router = new Memoirist({ lazy: true })

router.add('GET', '/api/:required/:optional?', 'ok')

console.log(router.find('GET', '/api/search'))
console.log(router.find('GET', '/api/search/ok'))
