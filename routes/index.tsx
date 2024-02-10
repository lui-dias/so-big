'island'

import { effect, useSignal } from '@preact/signals'
import { zip } from 'https://deno.land/std@0.215.0/collections/zip.ts'
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
				name: key,
				size: JSON.stringify(value).length,
				percentage: JSON.stringify(value).length / totalSize,
				children: indexJson(value as Record<string, unknown>, totalSize),
			})
		} else if (Array.isArray(value)) {
			r.push({
				name: key,
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
						title={path}
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
	error?: 'NO_FRESH'
}

function Form(
	{ handleSubmit }: { handleSubmit: (s: string) => void },
) {
	return (
		<form
			// deno-lint-ignore fresh-server-event-handlers
			onSubmit={(e) => {
				e.preventDefault()

				const url = e.currentTarget.elements.namedItem('url') as HTMLInputElement

				handleSubmit(url.value)
			}}
		>
			<input
				type='url'
				name='url'
				required
				class='border border-black'
			/>
			<button type='submit'>Go</button>
		</form>
	)
}

export default function () {
	const state = useSignal({} as State)

	async function handleSubmit(url: string) {
		state.value = await fetch(`/api/frsh-state?url=${encodeURIComponent(url)}`)
			.then((r) => r.json())
	}

	if (state.value.error === 'NO_FRESH') {
		return (
			<>
				<Form handleSubmit={handleSubmit} />
				<div>
					<strong class='text-6xl font-black text-red-500'>
						This site does not use Fresh
					</strong>
				</div>
			</>
		)
	}

	return (
		<>
			<Form handleSubmit={handleSubmit} />
			{Object.keys(state.value).length > 0 && (
				<div class='w-full'>
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
