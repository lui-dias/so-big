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
	images: {
		id: string
		src: string
		width: number
		height: number
		lazy: boolean
		preload: boolean
		type: 'picture' | 'img'
		fetchPriorityHigh: boolean
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
		<collapsable.Collapsable class='flex flex-col [&:has(>input:checked)>div>label>svg]:rotate-90 mt-1'>
			<div class='flex items-center'>
				<collapsable.Trigger class='h-full flex justify-center items-center'>
					{children.length > 0 && (
						<ChevronRight
							width={24}
							height={24}
							class='transition-transform text-slate-500'
						/>
					)}
					<span
						class={`bg-neutral-800 px-2 min-w-[96px] h-10 flex justify-center items-center text-slate-400 ${
							children.length > 0 ? '' : 'ml-6'
						}`}
					>
						{formatSize(size)}
					</span>
				</collapsable.Trigger>
				<div class='flex items-center w-full h-10'>
					<button
						type='button'
						class={`rounded-tr-sm h-10 rounded-br-sm mx-1 ${
							size > 5000 ? 'bg-red-700' : 'bg-green-700'
						}`}
						style={{ width: `${percentage * 100}%` }}
						aria-label={path}
						data-balloon-pos='right'
						// deno-lint-ignore fresh-server-event-handlers
						onClick={() => navigator.clipboard.writeText(data)}
					/>

					<span class='font-bold block mr-2 text-slate-400'>{name}</span>
					<span class='text-slate-600'>{(percentage * 100).toFixed(2)}%</span>
				</div>
			</div>
			{children.length > 0 && (
				<collapsable.ContentWrapper>
					<collapsable.Content class='flex flex-col ml-4'>
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
			class='max-w-5xl mx-auto w-full mt-36 rounded transition-all ring-1 bg-neutral-800 ring-zinc-100/20 focus-within:ring-2 focus-within:ring-green-700 flex'
		>
			<input
				type='url'
				name='url'
				required
				class='w-full px-3 py-2 focus:outline-0 bg-transparent text-slate-400 placeholder:text-slate-400/50'
				placeholder='https://storefront.deco.site'
				autofocus
			/>
			<button
				type='submit'
				class='h-11 w-20 flex justify-center items-center text-slate-400'
			>
				{loading.value
					? <Icon.Loading width={32} height={32} class='animate-spin' />
					: (
						<Icon.Weight
							width={32}
							height={32}
						/>
					)}
			</button>
		</form>
	)
}

export default function () {
	const state = useSignal({} as State)

	const imagesCollapsable = useCollapsable()

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

	const imgs = state.value.images?.filter((i) => i.type === 'img')
	const pictures = state.value.images?.filter((i) => i.type === 'picture')

	const lazyImgs = imgs?.filter((i) => i.lazy)
	const lazyPictures = pictures?.filter((i) => i.lazy)

	const preloadImgs = imgs?.filter((i) => i.preload)
	const preloadPictures = pictures?.filter((i) => i.preload)

	const fetchPriorityHighImgs = imgs?.filter((i) => i.fetchPriorityHigh)
	const fetchPriorityHighPictures = pictures?.filter((i) => i.fetchPriorityHigh)

	return (
		<>
			<Form handleSubmit={handleSubmit} />
			{Object.keys(state.value).length > 0 && (
				<div class='w-full mx-auto mt-12 max-w-5xl flex flex-col gap-20'>
					<div>
						<strong class='text-4xl block mb-10'>
							<span class='text-gray-500 text-xl'>TOTAL:</span>{' '}
							<span class='font-bold text-slate-200'>
								{formatSize(state.value.FRSH_STATE_SIZE)}
							</span>
						</strong>

						<div class='flex items-center gap-4 mb-4'>
							<span
								aria-label={`Ver o tamanho das props (FRSH_STATE) enviado pelo Fresh

Clique na seta ou no tamanho ao lado pra ver o que tem dentro
A barra fica vermelha se o tamanho for > 5kb
Clique na barra pra copiar o json
[0], [1], [2] ... significa que é um item do array`}
								data-balloon-pos='up'
								class='after:!whitespace-pre'
							>
								<Icon.QuestionMark
									width={32}
									height={32}
									class='text-slate-400'
								/>
							</span>
							<button
								type='button'
								title='Recolher todos os itens'
								// deno-lint-ignore fresh-server-event-handlers
								onClick={(e) => {
									for (
										const i of e.currentTarget.parentElement?.nextElementSibling
											?.querySelectorAll<
												HTMLInputElement
											>('input') ?? []
									) {
										i.checked = false
									}
								}}
							>
								<Icon.Collapse width={32} height={32} class='text-slate-400' />
							</button>
							<button
								type='button'
								title='Expandir todos os itens'
								// deno-lint-ignore fresh-server-event-handlers
								onClick={(e) => {
									for (
										const i of e.currentTarget.parentElement?.nextElementSibling
											?.querySelectorAll<
												HTMLInputElement
											>('input') ?? []
									) {
										i.checked = true
									}
								}}
							>
								<Icon.Expand width={32} height={32} class='text-slate-400' />
							</button>
						</div>

						<ul>
							{indexJson(
								JSON.parse(state.value.FRSH_STATE).v[0],
								state.value.FRSH_STATE_SIZE,
							)
								.map((i, ii) => <Row {...i} path={`[${ii}]`} />)}
						</ul>
					</div>

					{state.value.images.length === 0
						? (
							<span class='text-red-500 text-lg'>
								Nenhuma imagem é lazy
							</span>
						)
						: (
							<>
								<div class='flex flex-wrap bg-zinc-800 border border-zinc-700 rounded divide-x divide-zinc-100/20 w-fit'>
									<div
										class='flex items-center gap-2 px-3 py-2'
										aria-label={`${imgs.length} Images and ${pictures.length} Pictures`}
										data-balloon-pos='up'
									>
										<Icon.Image width={32} height={32} class='text-zinc-400' />
										<span class='text-sm text-zinc-400'>
											{state.value.images.length} Images
										</span>
									</div>
									<div
										class='flex items-center gap-2 px-3 py-2'
										aria-label={`${lazyImgs.length} Images and ${lazyPictures.length} Pictures`}
										data-balloon-pos='up'
									>
										<Icon.Sleep width={32} height={32} class='text-zinc-400' />
										<span class='text-sm text-zinc-400'>
											{state.value.images.filter((i) => i.lazy).length} Lazy
										</span>
									</div>
									<div
										class='flex items-center gap-2 px-3 py-2'
										aria-label={`${preloadImgs.length} Images and ${preloadPictures.length} Pictures`}
										data-balloon-pos='up'
									>
										<Icon.Clock width={32} height={32} class='text-zinc-400' />
										<span class='text-sm text-zinc-400'>
											{state.value.images.filter((i) =>
												i.preload
											).length} Preload
										</span>
									</div>
									<div
										class='flex items-center gap-0.5 pl-1 pr-3 py-2'
										aria-label={`${fetchPriorityHighImgs.length} Images and ${fetchPriorityHighPictures.length} Pictures`}
										data-balloon-pos='up'
									>
										<Icon.HighPriority
											width={32}
											height={32}
											class='text-zinc-400'
										/>
										<span class='text-sm text-zinc-400'>
											{state.value.images.filter((i) => i.fetchPriorityHigh)
												.length} Fetch Priority High
										</span>
									</div>
								</div>
								<imagesCollapsable.Collapsable class='[&:has(>input:checked)>label>svg]:rotate-90'>
									<imagesCollapsable.Trigger class='text-4xl mb-4 flex items-center gap-1'>
										<ChevronRight
											width={32}
											height={32}
											class='transition-transform text-slate-500'
										/>
										<span class='text-slate-400'>
											Images
										</span>
									</imagesCollapsable.Trigger>
									<imagesCollapsable.ContentWrapper>
										<imagesCollapsable.Content class='flex flex-wrap bg-neutral-800'>
											{state.value.images.map((i) => {
												const isSmall = i.width < Math.min(innerWidth, 1024)

												return (
													<>
														{i.width > 0 && i.height > 0 && (
															<a
																key={i.id}
																class='text-blue-500 hover:text-blue-700 relative h-[200px] p-1 flex-grow flex justify-center items-center group border-y first:border-t-0 last:border-b-0 border-y-neutral-700'
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
																	{i.width}x{i.height}
																</span>
															</a>
														)}
													</>
												)
											})}
										</imagesCollapsable.Content>
									</imagesCollapsable.ContentWrapper>
								</imagesCollapsable.Collapsable>
							</>
						)}

					<div class='w-full h-10' />
				</div>
			)}
		</>
	)
}
