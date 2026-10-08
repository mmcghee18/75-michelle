import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Static build into docs/ for GitHub Pages (main branch, /docs folder).
			adapter: adapter({ pages: 'docs' }),
			// Served from mmcghee18.github.io/75-michelle/ in production.
			paths: { base: command === 'build' ? '/75-michelle' : '' }
		})
	]
}));
