import type { JSX } from 'preact'
import { clsx } from '../sdk/clx.ts'
import { useId } from 'preact/hooks'

export default function (id_?: string) {
	const id = useId() || id_

	return {
		Collapsable: (
			{ children, open, ...props }: JSX.IntrinsicElements['div'] & {
				open?: boolean
			},
		) => (
			<div {...props}>
				<input type='checkbox' id={id} class='hidden peer' checked={open} />
				{children}
			</div>
		),

		Trigger: (props: JSX.IntrinsicElements['label']) => (
			<label
				{...props}
				for={id}
				class={clsx('cursor-pointer select-none', props.class as string)}
			/>
		),

		ContentWrapper: (
			{ customTransition, ...props }: JSX.IntrinsicElements['div'] & {
				customTransition?: boolean
			},
		) => (
			<div
				{...props}
				class={clsx(
					'group grid transition-all',
					!customTransition && 'grid-rows-[0fr] peer-checked:grid-rows-[1fr]',
					props.class as string,
				)}
			/>
		),

		Content: (
			props: JSX.IntrinsicElements['div'] & { noOverflow?: boolean },
		) => (
			<div
				{...props}
				class={clsx(
					'[grid-row:1_/_span_2]',
					!props.noOverflow && 'overflow-hidden',
					props.class as string,
				)}
			/>
		),
	}
}
