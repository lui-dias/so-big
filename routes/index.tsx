import { useSignal } from '@preact/signals'
import type { JSX } from 'preact'
import useCollapsable from '../components/useCollapsable.tsx'
import formatSize from '../sdk/formatSize.ts'
import Icon from '../components/Icon.tsx'

type Index = {
	name: string
	size: number
	percentage: number
	data: string
	children: Index[]
}

export type State = {
	FRSH_STATE: string
	FRSH_STATE_SIZE: number
	sections: {
		name: string
		stateSize: number
	}[]
	imagesPreloads: {
		id: string
		src: string
		width: number
		height: number
	}[]
	imagesLazy: {
		id: string
		src: string
		width: number
		height: number
		lazy: boolean
	}[]
	error?: 'NO_FRESH' | 'FETCH_ERROR'
}

function indexJson(json: Record<string, unknown>, totalSize: number) {
	const r = [] as Index[]

	if (json === null) return r

	for (const [key, value] of Object.entries(json)) {
		const valueAsString = JSON.stringify(value)

		if (typeof value === 'object') {
			r.push({
				name: /\d+/.test(key) ? `[${key}]` : key,
				size: valueAsString.length,
				percentage: valueAsString.length / totalSize,
				children: indexJson(value as Record<string, unknown>, totalSize),
				data: valueAsString,
			})
		} else if (Array.isArray(value)) {
			r.push({
				name: /\d+/.test(key) ? `[${key}]` : key,
				size: valueAsString.length,
				percentage: valueAsString.length / totalSize,
				children: value.flatMap(indexJson),
				data: valueAsString,
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
	{ name, size, percentage, children, path, data }: Index & { path: string },
) {
	const collapsable = useCollapsable()

	return (
		<collapsable.Collapsable class='flex flex-col gap-1 [&:has(>input:checked)>div>label>svg]:rotate-90'>
			<div class='flex items-center'>
				<collapsable.Trigger class='h-full flex justify-center items-center'>
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
					<button
						type='button'
						class={`h-10 rounded mx-1 ${size > 5000 ? 'bg-red-500' : 'bg-green-600'}`}
						style={{ width: `${percentage * 100}%` }}
						aria-label={path}
						data-balloon-pos='right'
						// deno-lint-ignore fresh-server-event-handlers
						onClick={() => navigator.clipboard.writeText(data)}
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
				placeholder='https://storefront.deco.site'
				autofocus
			/>
			<button type='submit' class='h-11 w-20 flex justify-center items-center'>
				{loading.value
					? <Icon.Loading width={32} height={32} class='animate-spin' />
					: <Icon.Weight width={32} height={32} />}
			</button>
		</form>
	)
}

export default function () {
	const state = useSignal({} as State)

	const preloadCollapsable = useCollapsable()
	const lazyCollapsable = useCollapsable()

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
				<div class='w-full mx-auto mt-12 max-w-5xl flex flex-col gap-20'>
					<div>
						<strong class='text-4xl block mb-10'>
							<span class='text-gray-500'>TOTAL:</span>{' '}
							<span class='font-bold'>{formatSize(state.value.FRSH_STATE_SIZE)}</span>
						</strong>

						<ul class='flex flex-col gap-1'>
							{indexJson(
								JSON.parse(state.value.FRSH_STATE).v[0],
								state.value.FRSH_STATE_SIZE,
							)
								.map((i, ii) => <Row {...i} path={`[${ii}]`} />)}
						</ul>
					</div>

					{state.value.imagesPreloads.length === 0
						? (
							<span class='text-red-500 text-lg'>
								Nenhuma imagem tem preload
							</span>
						)
						: (
							<preloadCollapsable.Collapsable class='[&:has(>input:checked)>label>svg]:rotate-90'>
								<preloadCollapsable.Trigger class='text-4xl mb-4 flex items-center gap-1'>
									<ChevronRight
										width={32}
										height={32}
										class='transition-transform'
									/>
									<span>
										Preload:{' '}
										<span class='font-bold'>
											{state.value.imagesPreloads.length}
										</span>
									</span>
								</preloadCollapsable.Trigger>
								<preloadCollapsable.ContentWrapper>
									<preloadCollapsable.Content class='flex flex-wrap bg-gray-100'>
										{state.value.imagesPreloads.map((i) => {
											const isSmall = i.width < Math.min(innerWidth, 1024)

											return (
												<>
													{i.width > 0 && i.height > 0 && (
														<a
															key={i.id}
															class='text-blue-500 hover:text-blue-700 relative h-[200px] p-1 flex-grow flex justify-center items-center group border-y-2 first:border-t-0 last:border-b-0 border-y-gray-200'
															href={i.src}
															target='_blank'
															rel='noopener noreferrer'
														>
															<img
																src={i.src}
																alt=''
																class={`object-cover rounded max-h-full ${
																	isSmall ? '' : 'min-w-full'
																}`}
															/>

															<span class='absolute px-2 py-1 bg-black rounded-tl text-white font-medium opacity-0 transition-opacity group-hover:opacity-100 bottom-0 right-0'>
																Preload - {i.width}x{i.height}
															</span>
														</a>
													)}
												</>
											)
										})}
									</preloadCollapsable.Content>
								</preloadCollapsable.ContentWrapper>
							</preloadCollapsable.Collapsable>
						)}

					{state.value.imagesLazy.length === 0
						? (
							<span class='text-red-500 text-lg'>
								Nenhuma imagem é lazy
							</span>
						)
						: (
							<lazyCollapsable.Collapsable class='[&:has(>input:checked)>label>svg]:rotate-90'>
								<lazyCollapsable.Trigger class='text-4xl mb-4 flex items-center gap-1'>
									<ChevronRight
										width={32}
										height={32}
										class='transition-transform'
									/>
									<span>
										Lazy:{' '}
										<span class='font-bold'>
											{state.value.imagesLazy.length}
										</span>
									</span>
								</lazyCollapsable.Trigger>
								<lazyCollapsable.ContentWrapper>
									<lazyCollapsable.Content class='flex flex-wrap bg-gray-100'>
										{state.value.imagesLazy.map((i) => {
											const isSmall = i.width < Math.min(innerWidth, 1024)

											return (
												<>
													{i.width > 0 && i.height > 0 && (
														<a
															key={i.id}
															class='text-blue-500 hover:text-blue-700 relative h-[200px] p-1 flex-grow flex justify-center items-center group border-y-2 first:border-t-0 last:border-b-0 border-y-gray-200'
															href={i.src}
															target='_blank'
															rel='noopener noreferrer'
														>
															<img
																src={i.src}
																alt=''
																class={`object-cover rounded max-h-full ${
																	isSmall ? '' : 'min-w-full'
																}`}
															/>

															<span class='absolute px-2 py-1 bg-black rounded-tl text-white font-medium opacity-0 transition-opacity group-hover:opacity-100 bottom-0 right-0'>
																Lazy - {i.width}x{i.height}
															</span>
														</a>
													)}
												</>
											)
										})}
									</lazyCollapsable.Content>
								</lazyCollapsable.ContentWrapper>
							</lazyCollapsable.Collapsable>
						)}

					<div class='w-full h-10' />
				</div>
			)}
		</>
	)
}
