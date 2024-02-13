/** filter out nullable values, join and minify class names */
export default function (...args: (string | null | undefined | false)[]) {
	return args.filter(Boolean).join(' ').replace(/\s\s+/g, ' ')
}
