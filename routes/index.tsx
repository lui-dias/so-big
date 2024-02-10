'island'

import { useSignal } from '@preact/signals'
import type { JSX } from 'preact'
import { useId } from 'preact/hooks'
import useCollapsable from '../components/useCollapsable.tsx'

function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`

	return `${(bytes / 1024 ** 2).toFixed(2)} MB`
}

type Index = {
	name: string
	size: number
	percentage: number
	children: Index[]
}

function indexJson(json: Record<string, unknown>, totalSize: number) {
	const r = [] as Index[]

	for (const [key, value] of Object.entries(json)) {
		if (typeof value === 'object') {
			r.push({
				name: /\d+/.test(key) ? `[${key}]` : key,
				size: JSON.stringify(value).length,
				percentage: JSON.stringify(value).length / totalSize,
				children: indexJson(value as Record<string, unknown>, totalSize),
			})
		} else if (Array.isArray(value)) {
			r.push({
				name: /\d+/.test(key) ? `[${key}]` : key,
				size: JSON.stringify(value).length,
				percentage: JSON.stringify(value).length / totalSize,
				children: value.flatMap(indexJson),
			})
		}
	}

	return r
}

function ChevronRight(props: JSX.IntrinsicElements['svg']) {
	return (
		<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' {...props}>
			<title>Chevron Right</title>
			<path
				fill='currentColor'
				d='M10 6L8.59 7.41L13.17 12l-4.58 4.59L10 18l6-6z'
			/>
		</svg>
	)
}

function Row(
	{ name, size, percentage, children, path }: Index & { path: string },
) {
	const id = useId()
	const collapsable = useCollapsable()

	return (
		<collapsable.Collapsable
			id={id}
			class='flex flex-col gap-1 [&:has(>input:checked)>div>label>svg]:rotate-90'
		>
			<div class='flex items-center'>
				<collapsable.Trigger
					for={id}
					class='h-full flex justify-center items-center'
				>
					{children.length > 0 && (
						<ChevronRight width={24} height={24} class='transition-transform' />
					)}
					<span
						class={`bg-slate-800 py-1 px-2 min-w-[96px] flex justify-center items-center text-white ${
							children.length > 0 ? '' : 'ml-6'
						}`}
					>
						{formatSize(size)}
					</span>
				</collapsable.Trigger>
				<div class='flex items-center w-full'>
					<div
						class='h-10 bg-red-500 rounded mx-1'
						style={{ width: `${percentage * 100}%` }}
						aria-label={path}
						data-balloon-pos='right'
					/>

					<span class='font-bold block mr-2'>{name}</span>
					<span class='text-gray-400'>{(percentage * 100).toFixed(2)}%</span>
				</div>
			</div>
			{children.length > 0 && (
				<collapsable.ContentWrapper>
					<collapsable.Content class='flex flex-col gap-1 ml-4'>
						{children.map((i) => {
							const name = /\d+/.test(i.name) ? i.name : `"${i.name}"`

							return <Row {...i} path={`${path}[${name}]`} />
						})}
					</collapsable.Content>
				</collapsable.ContentWrapper>
			)}
		</collapsable.Collapsable>
	)
}

export type State = {
	FRSH_STATE: string
	FRSH_STATE_SIZE: number
	sections: {
		name: string
		stateSize: number
	}[]
	error?: 'NO_FRESH' | 'FETCH_ERROR'
}

function Form(
	{ handleSubmit }: { handleSubmit: (s: string) => Promise<void> },
) {
	const loading = useSignal(false)

	return (
		<form
			// deno-lint-ignore fresh-server-event-handlers
			onSubmit={async (e) => {
				e.preventDefault()

				const url = e.currentTarget.elements.namedItem('url') as HTMLInputElement

				loading.value = true
				await handleSubmit(url.value)
				loading.value = false
			}}
			class='max-w-5xl mx-auto w-full mt-36 rounded border-2 border-slate-600 flex'
		>
			<input
				type='url'
				name='url'
				required
				class='w-full px-3 py-2 outline-0'
				autofocus
			/>
			<button type='submit' class='h-11 w-20 flex justify-center items-center'>
				{loading.value
					? (
						<svg
							xmlns='http://www.w3.org/2000/svg'
							width='32'
							height='32'
							viewBox='0 0 24 24'
							class='animate-spin'
						>
							<title>Loading</title>
							<g fill='none' fill-rule='evenodd'>
								<path d='M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093c.012.004.023 0 .029-.008l.004-.014l-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014l-.034.614c0 .012.007.02.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z' />
								<path
									fill='currentColor'
									d='M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12'
									opacity='.1'
								/>
								<path
									fill='currentColor'
									d='M12 4.5a7.458 7.458 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.458 10.458 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3'
								/>
							</g>
						</svg>
					)
					: (
						<svg
							xmlns='http://www.w3.org/2000/svg'
							width='32'
							height='32'
							viewBox='0 0 24 24'
						>
							<title>Weight</title>
							<path
								fill='currentColor'
								d='M12 3a4 4 0 0 1 4 4c0 .73-.19 1.41-.54 2H18c.95 0 1.75.67 1.95 1.56C21.96 18.57 22 18.78 22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2c0-.22.04-.43 2.05-8.44C4.25 9.67 5.05 9 6 9h2.54A3.89 3.89 0 0 1 8 7a4 4 0 0 1 4-4m0 2a2 2 0 0 0-2 2a2 2 0 0 0 2 2a2 2 0 0 0 2-2a2 2 0 0 0-2-2m-6 6v8h2v-2.5l1 1V19h2v-2l-2-2l2-2v-2H9v1.5l-1 1V11zm9 0c-1.11 0-2 .89-2 2v4c0 1.11.89 2 2 2h3v-5h-2v3h-1v-4h3v-2z'
							/>
						</svg>
					)}
			</button>
		</form>
	)
}

export default function () {
	const state = useSignal({} as State)

	async function handleSubmit(url: string) {
		state.value = await fetch(`/api/frsh-state?url=${encodeURIComponent(url)}`)
			.then((r) => r.json())
	}

	if (state.value.error) {
		return (
			<>
				<Form handleSubmit={handleSubmit} />
				<div class='mx-auto mt-12'>
					<strong class='text-6xl font-black text-red-500'>
						{state.value.error === 'NO_FRESH'
							? 'This site does not use Fresh'
							: state.value.error === 'FETCH_ERROR'
							? 'Probably site not found'
							: 'You blow up my server'}
					</strong>
				</div>
			</>
		)
	}

	return (
		<>
			<Form handleSubmit={handleSubmit} />
			{Object.keys(state.value).length > 0 && (
				<div class='w-full mx-auto mt-12 max-w-5xl'>
					<div class='ml-4 mb-10 flex flex-col gap-2'>
						<strong class='text-4xl'>
							<span class='text-gray-500'>TOTAL:</span>{' '}
							<span class='font-bold'>{formatSize(state.value.FRSH_STATE_SIZE)}</span>
						</strong>
					</div>

					<ul class='flex flex-col gap-1'>
						{indexJson(
							JSON.parse(state.value.FRSH_STATE).v[0],
							state.value.FRSH_STATE_SIZE,
						)
							.map((i, ii) => <Row {...i} path={`[${ii}]`} />)}
					</ul>
				</div>
			)}
		</>
	)
}
