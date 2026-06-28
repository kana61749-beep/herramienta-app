const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#0D9488"/>
  <text x="16" y="23" font-size="19" text-anchor="middle"
        fill="white" font-family="system-ui,sans-serif" font-weight="700">H</text>
</svg>`

const FAVICON_URL = `data:image/svg+xml,${encodeURIComponent(SVG)}`

export function activarFaviconHerramientas(): () => void {
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]')
  )
  const anteriores = links.map(l => l.href)
  links.forEach(l => { l.href = FAVICON_URL })
  return () => links.forEach((l, i) => { l.href = anteriores[i] })
}
