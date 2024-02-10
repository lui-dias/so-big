export default function (bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`

	return `${(bytes / 1024 ** 2).toFixed(2)} MB`
}
