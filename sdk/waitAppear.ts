export default function (selector: string) {
	return new Promise((resolve) => {
		const el = document.querySelector(selector)
		if (el) {
			resolve(el)
			return
		}
		new MutationObserver((_, observer) => {
			for (const element of [...document.querySelectorAll(selector)]) {
				resolve(element)
				observer.disconnect()
			}
		})
			.observe(document.documentElement, {
				childList: true,
				subtree: true,
			})
	})
}
