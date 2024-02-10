import { Plugin } from '$fresh/server.ts'
import { expandGlob } from '$std/fs/expand_glob.ts'
import { toFileUrl } from '$std/path/to_file_url.ts'
import { yellow } from '$std/fmt/colors.ts'

const islands = new Set<string>()
const decoder = new TextDecoder()
const exclude = JSON.parse(await Deno.readTextFile('deno.json')).exclude

const start = performance.now()

for await (
	const file of expandGlob('**/*.tsx', {
		exclude: exclude ?? [],
	})
) {
	if (!file.isFile) throw new Error(`${file.path} is not a file`)

	const f = await Deno.open(file.path)

	const buf = new Uint8Array(20)
	await f.read(buf)

	if (decoder.decode(buf).match(/['"]island['"]/)) {
		islands.add(toFileUrl(file.path).href)
	}

	f.close()
}

console.log(
	yellow(
		`\u26A1 Found ${islands.size} islands in ${
			Math.floor(
				performance.now() - start,
			)
		}ms`,
	),
)

export default function (): Plugin {
	return {
		name: 'island',
		islands: {
			baseLocation: '',
			paths: [...islands],
		},
	}
}
