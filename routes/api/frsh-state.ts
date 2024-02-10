import { zip } from '$std/collections/zip.ts'
import { Handlers } from '$fresh/server.ts'
import { State } from '../index.tsx'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

export const handler: Handlers<State> = {
	async GET(req) {
		const url = new URL(req.url).searchParams.get('url')

		if (!url) {
			return new Response(JSON.stringify({ error: 'NO_URL' }))
		}

		const dom = new DOMParser().parseFromString(
			await fetch(url).then((r) => r.text()),
			'text/html',
		)

		if (!dom) throw new Error('no dom')

		const state = {} as State

		state.FRSH_STATE = dom.querySelector('script[id^="__FRSH_STATE"]')?.textContent ?? ''

		if (!state.FRSH_STATE) {
			state.error = 'NO_FRESH'

			return new Response(JSON.stringify(state))
		}

		state.FRSH_STATE_SIZE = JSON.stringify(state.FRSH_STATE).length

		const sections = [
			...(dom.querySelectorAll(
				'section[data-manifest-key]',
			) as unknown as Element[]),
		].map(
			(el) => el.getAttribute('data-manifest-key') || '',
		)

		state.sections = zip(sections, JSON.parse(state.FRSH_STATE).v[0])
			.map((
				[name, s],
			) => ({
				name,
				stateSize: JSON.stringify(s).length,
			}))

		return new Response(JSON.stringify(state))
	},
}
