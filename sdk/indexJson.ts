export type Index = {
	name: string
	size: number
	percentage: number
	data: string
	children: Index[]
}

export default function indexJson(json: Record<string, unknown>, totalSize: number) {
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
