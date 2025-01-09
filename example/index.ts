import { Memoirist } from '../src'

const router = new Memoirist({ lazy: true })

router.add(
	'GET',
	'/api/search/:term?/:name?/:age?',
	'/api/search/:term?/:name?/:age?'
)

console.log(router.find('GET', '/api/search'))

router.add('GET', '/api/a', '/api/a')

console.log(router.find('GET', '/api/a'))

// router.add('GET', '/api/search/:term?/:name?/:age?', 'a')
// console.log(router.history.map(([method, path, store]) => path))

// console.log('GOT', router.find('GET', '/api/search/term/name/age/10'))
