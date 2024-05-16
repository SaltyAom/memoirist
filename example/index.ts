import { Memoirist } from '../src'

const router = new Memoirist()

router.add(
    'GET',
    '/api/search/:term?/:name?/:age?',
    '/api/search/:term?/:name?/:age?'
)

// router.add('GET', '/api/search/:term?/:name?/:age?', 'a')
// console.log(router.history.map(([method, path, store]) => path))

// console.log('GOT', router.find('GET', '/api/search/term/name/age/10'))
