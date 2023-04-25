import { Memoirist } from '../src'

import { describe, expect, it } from 'bun:test'

const router = new Memoirist()
router.add('GET', '/v1/genres', '/g')
router.add('GET', '/v1/genres/:id', '/g/:id')
router.add('GET', '/v1/statuse', '/s')
router.add('GET', '/v1/statuse/:id', '/s/:id')

describe('Add', () => {
    it('Clean up path mangling', () => {
        expect(router.find('GET', '/v1/statuse/1')).toEqual({
            store: '/s/:id',
            params: {
                id: '1'
            }
        })
    })
})
