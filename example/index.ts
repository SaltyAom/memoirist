import { Memoirist } from '../src'

const router = new Memoirist({
	lazy: true,
	onParam(value, key) {
		console.log(key)
		if(key === 'required')
			return 'a!'
	}
})

router.add('GET', '/api/:required/:optional?', 'ok')

console.log(router.find('GET', '/api/search'))
