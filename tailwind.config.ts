/**
 * Tailwind CSS v4 configuration
 *
 * In Tailwind v4, most theme customization is done in CSS using @theme directives
 * in globals.css. This file is used primarily to configure the content scanning paths.
 *
 * For theme tokens, see app/globals.css → @theme inline block.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}

export default config
