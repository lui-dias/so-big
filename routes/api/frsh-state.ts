import { zip } from '$std/collections/zip.ts'
import { Handlers } from '$fresh/server.ts'
import { State } from '../index.tsx'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'
import { imageDimensionsFromStream } from 'npm:image-dimensions'
import { nanoid } from 'npm:nanoid'

export const handler: Handlers<State> = {
	async GET(req) {
		const url = new URL(req.url).searchParams.get('url')

		if (!url) {
			return new Response(JSON.stringify({ error: 'NO_URL' }))
		}

		const r = await fetch(url).then((r) => r.text()).catch((e) => {
			if (e instanceof TypeError) {
				return new Response(JSON.stringify({ error: 'FETCH_ERROR' }))
			}

			return e
		})

		if (r instanceof Response) {
			return r
		}

		const dom = new DOMParser().parseFromString(r, 'text/html')
		if (!dom) throw new Error('no dom')

		function querySelectorAll(selectors: string) {
			if (!dom) throw new Error('no dom')

			return [...dom.querySelectorAll(selectors)] as unknown as Element[]
		}

		const state = {} as State

		state.FRSH_STATE = dom.querySelector('script[id^="__FRSH_STATE"]')?.textContent ?? ''
		if (!state.FRSH_STATE) {
			state.error = 'NO_FRESH'

			return new Response(JSON.stringify(state))
		}

		state.FRSH_STATE_SIZE = JSON.stringify(state.FRSH_STATE).length

		const imagesPreloads = querySelectorAll('link[rel=preload][as=image]').map((el) => {
			let src = el.getAttribute('href') || ''

			if (src.includes('image.ts')) {
				const normalUrl = new URL(`http://localhost:8000${src}`).searchParams.get('src')

				if (!normalUrl) throw new Error('no normal url')

				src = normalUrl
			}

			const fetchPriorityHigh = el.getAttribute('fetchpriority') === 'high'

			return { src, fetchPriorityHigh }
		})

		state.images = await Promise.all(
			[...querySelectorAll('img'), ...querySelectorAll('picture > source')].map(
				async (el) => {
					const lazy = el.getAttribute('loading') === 'lazy'
					let src = el.getAttribute('src') ||
						el.getAttribute('srcset')?.split(' ').at(-2) || ''

					if (src.includes('image.ts')) {
						const normalUrl = new URL(`http://localhost:8000${src}`).searchParams.get(
							'src',
						)

						if (!normalUrl) throw new Error('no normal url')

						src = normalUrl
					}

					const preload = imagesPreloads.find((i) => i.src === src)

					const hasOrigin = !src.startsWith('/')
					const r = await fetch(hasOrigin ? src : url.replace(/\/$/, '') + src)

					if (!r.body) throw new Error('no body')

					const im = await imageDimensionsFromStream(r.body)

					const { width, height } = im ?? {
						width: 0,
						height: 0,
					}

					return {
						id: nanoid(),
						src: hasOrigin ? src : url.replace(/\/$/, '') + src,
						width,
						height,
						lazy,
						type: el.tagName === 'SOURCE' ? 'picture' : 'img',
						preload: !!preload,
						fetchPriorityHigh: !!preload?.fetchPriorityHigh,
					}
				},
			),
		)

		const sections = querySelectorAll('section[data-manifest-key]').map(
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
