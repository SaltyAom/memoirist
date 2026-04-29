import { LazyMemoirist as Memoirist } from '../src/lazy'

const router = new Memoirist()

router.add('GET', '/name/:name', 'ok')
router.add('GET', '/name/:id/:name', 'ok')

console.log(router.find('GET', '/name/1')) // { name: 'ok', params: { name: '1' } }
console.log(router.find('GET', '/name/1/2')) // { name: 'ok', params: { id: '1', name: '2' } }
