import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
	srcDir: "./src/web",
	output: "static",
	adapter: vercel(),
	site: "https://muniscan.crafter.ing",
	vite: { plugins: [tailwindcss()] },
});
