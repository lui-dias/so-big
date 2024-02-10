import { defineConfig } from '$fresh/server.ts'
import tailwind from '$fresh/plugins/tailwind.ts'
import island from './plugins/island.ts'

export default defineConfig({
	plugins: [tailwind(), island()],
})
