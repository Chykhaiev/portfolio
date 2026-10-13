#!/usr/bin/env python3
"""Bundle each language page into one self-contained HTML file for Claude previews (not deployed)."""
import base64, re, pathlib
P = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path('/home/claude/portfolio-preview'); OUT.mkdir(exist_ok=True)
def d(path, mime): return f"data:{mime};base64," + base64.b64encode((P / path).read_bytes()).decode()
css = (P / 'styles.css').read_text()
for f, m in [("fonts/Geist-Variable.woff2", "font/woff2"), ("fonts/GeistMono-Variable.woff2", "font/woff2"),
             ("fonts/InstrumentSerif-Italic.woff", "font/woff")]:
    css = css.replace(f'url("{f}")', f'url("{d(f, m)}")')
js = (P / 'main.js').read_text()
for src, out, title, lang in [('index.html', 'portfolio-home.html', 'Oleksandr Chykhaiev Portfolio', 'en')]:
    h = (P / src).read_text()
    body = re.search(r'<body>(.*)</body>', h, re.S).group(1)
    body = re.sub(r'<script src="[^"]*main.js" defer></script>', '<script>' + js + '</script>', body)
    body = re.sub(r'src="(?:\.\./)?img/diamonds-hero.jpg"', f'src="{d("img/diamonds-hero.jpg", "image/jpeg")}"', body)
    setlang = f'<script>document.documentElement.lang="{lang}"</script>'
    (OUT / out).write_text(f'<title>{title}</title>\n{setlang}\n<style>\n{css}\n</style>\n{body}')
    print(out)

# case pages
for src, out, title in [('work/diamonds-vpn/index.html', 'case-diamonds.html', 'Diamonds VPN Case Study')]:
    h = (P / src).read_text()
    body = re.search(r'<body[^>]*>(.*)</body>', h, re.S).group(1)
    body = re.sub(r'<script src="[^"]*main.js" defer></script>', '<script>' + js + '</script>', body)
    def inline(m):
        path = m.group(1).replace('../../', '')
        return f'src="{d(path, "image/jpeg")}"'
    body = re.sub(r'src="(\.\./\.\./img/[^"]+\.jpg)"', inline, body)
    body = body.replace(' loading="lazy"', '')
    # artifact previews can't embed other sites: show the poster there
    body = re.sub(r'<iframe[^>]*></iframe>', '', body)
    css_case = css + '\n.live-poster{display:block!important;position:static}.live-frame{height:auto}'
    (OUT / out).write_text(f'<title>{title}</title>\n<style>\n{css_case}\n</style>\n<div class="case-page">{body}</div>')
    print(out)
