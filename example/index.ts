import { Memoirist } from '../src'

const router = new Memoirist()

router.add('GET', '/api/search/:term', '/api/search/:term')
router.add('GET', '/api/abc/view/:id', '/api/abc/view/:id')
router.add('GET', '/api/abc/:type', '/api/abc/:type')

console.log('GOT', router.find('GET', '/api/search/type'))
