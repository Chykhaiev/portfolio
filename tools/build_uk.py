#!/usr/bin/env python3
"""Build the Ukrainian page (uk/index.html) from the English source (index.html).

index.html is the single source of layout. This script swaps every English
string for its Ukrainian version and fixes asset paths for the /uk/ folder.
Every phrase must be found exactly once or more; a missing one stops the build,
so an edit to the English page can't silently leave English text in /uk/.
"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "index.html").read_text(encoding="utf-8")

# (english, ukrainian) — longer, more specific strings first
T = [
    # head
    ('<html lang="en">', '<html lang="uk">'),
    ("<title>Oleksandr Chykhaiev — UI/UX & AI Designer</title>", "<title>Олександр Чихаєв — UI/UX & AI дизайнер</title>"),
    ('content="UI/UX designer from Kyiv. Product interfaces, design systems and research, prototyped with AI."',
     'content="UI/UX дизайнер з Києва. Інтерфейси продуктів, дизайн-системи та дослідження, прототипи з AI."'),
    ('href="fonts/', 'href="../fonts/'),
    ('href="styles.css"', 'href="../styles.css"'),
    ('src="main.js"', 'src="../main.js"'),
    ('src="img/', 'src="../img/'),
    ('href="work/', 'href="../work/'),
    # top bar
    (">Skip to work<", ">Перейти до робіт<"),
    ('<span class="brand-name">Oleksandr Chykhaiev</span>', '<span class="brand-name">Олександр Чихаєв</span>'),
    ('<span class="brand-role">UI/UX &amp; AI Designer</span>', '<span class="brand-role">UI/UX &amp; AI дизайнер</span>'),
    ('aria-label="Back to top"', 'aria-label="Нагору"'),
    ('aria-label="Sections"', 'aria-label="Розділи"'),
    ('data-nav="work">Work<', 'data-nav="work">Роботи<'),
    ('data-nav="about">About<', 'data-nav="about">Про мене<'),
    ('data-nav="experience">Experience<', 'data-nav="experience">Досвід<'),
    ('data-nav="contact">Contact<', 'data-nav="contact">Контакти<'),
    ('aria-label="Language"><a href="./" lang="en" aria-current="page">EN</a><a href="uk/" lang="uk" hreflang="uk">UA</a>',
     'aria-label="Мова"><a href="../" lang="en" hreflang="en">EN</a><a href="./" lang="uk" aria-current="page">UA</a>'),
    ('data-todo="cv" target="_blank" rel="noopener">CV <span', 'data-todo="cv" target="_blank" rel="noopener">Резюме <span'),
    # hero
    ("Kyiv, Ukraine · Open to product design roles", "Київ, Україна · Відкритий до ролей у продуктовому дизайні"),
    ("I design clear products and bring them to <em>life</em> with AI.", "Проєктую зрозумілі продукти й <em>оживляю</em> їх з AI."),
    ("UI/UX designer with 4 years in product design: design systems, research synthesis and MVPs.<span class=\"muted\"> Most recently StayDirect and PostPixel.</span>",
     "UI/UX дизайнер, 4 роки в продуктовому дизайні: дизайн-системи, синтез досліджень і MVP.<span class=\"muted\"> Останні проєкти — StayDirect і PostPixel.</span>"),
    ('aria-label="Scroll to work"', 'aria-label="Прокрутити до робіт"'),
    # work
    (">Selected work<", ">Вибрані роботи<"),
    ("<b>Outsourced, US startup</b> — Direct bookings for vacation rental hosts, from onboarding to guest check-in.",
     "<b>Аутсорс, стартап зі США</b> — Прямі бронювання для власників орендного житла: від онбордингу до заселення гостей."),
    ("<b>postpixel.ai, 2025–26</b> — AI social posts for local service businesses.",
     "<b>postpixel.ai, 2025–26</b> — AI-пости для соцмереж локального сервісного бізнесу."),
    ("<b>v2 concept, 2026</b> — Tokens, 50 components and docs, rebuilt from scratch.",
     "<b>Концепт v2, 2026</b> — Токени, 50 компонентів і документація, зібрані з нуля."),
    ("<b>Concept, 2026</b> — A live 3D website, designed by me and built with AI-assisted code.",
     "<b>Концепт, 2026</b> — Живий 3D-сайт: дизайн мій, код написаний разом з AI."),
    ("<b>Team design sprint, 2024</b> — A networking app for offline events, from research to MVP.",
     "<b>Командний дизайн-спринт, 2024</b> — Застосунок для нетворкінгу на офлайн-івентах, від дослідження до MVP."),
    ('aria-hidden="true"></span>Live site</span>', 'aria-hidden="true"></span>Живий сайт</span>'),
    ('alt="Diamonds VPN concept: a dotted 3D globe with the headline Private internet, one tap away"',
     'alt="Концепт Diamonds VPN: 3D-глобус з точок і заголовок Private internet, one tap away"'),
    ("<li>Product UI</li><li>Redesign</li><li>Research</li>", "<li>Продуктовий UI</li><li>Редизайн</li><li>Дослідження</li>"),
    ("<li>App UX/UI</li><li>UI kit</li><li>AI product</li>", "<li>UX/UI застосунку</li><li>UI kit</li><li>AI-продукт</li>"),
    ("<li>Design system</li><li>Figma variables</li>", "<li>Дизайн-система</li><li>Змінні Figma</li>"),
    ("<li>Web design</li><li>Motion &amp; 3D</li><li>Built with Claude</li>", "<li>Веб-дизайн</li><li>Анімація і 3D</li><li>Зроблено з Claude</li>"),
    ("<li>Mobile app</li><li>Research</li><li>MVP</li>", "<li>Мобільний застосунок</li><li>Дослідження</li><li>MVP</li>"),
    ('<h3 class="card-title">StayDirect Design System</h3>', '<h3 class="card-title">Дизайн-система StayDirect</h3>'),
    # about
    ('id="about-h" class="label">About<', 'id="about-h" class="label">Про мене<'),
    ("I'm Oleksandr, a UI/UX designer from Kyiv. I turn messy products into <em>clear</em> ones.",
     "Я Олександр, UI/UX дизайнер з Києва. Перетворюю заплутані продукти на <em>зрозумілі</em>."),
    ("For four years I've designed product interfaces, from the first user interviews to a design system that developers use every day. I like the part where research becomes a clear decision on the screen.",
     "Чотири роки я проєктую інтерфейси продуктів: від перших інтерв'ю з користувачами до дизайн-системи, якою розробники користуються щодня. Найбільше люблю момент, коли дослідження стає зрозумілим рішенням на екрані."),
    ("Lately I also prototype with AI. I design in Figma, then build working versions in code with Claude, so I can test motion and flows in a real browser before anyone writes production code.",
     "Останнім часом я також прототипую з AI. Проєктую у Figma, а потім збираю робочі версії в коді разом з Claude, щоб перевірити анімацію і сценарії в справжньому браузері ще до продакшн-коду."),
    ("<dt>Experience</dt><dd>4 years</dd>", "<dt>Досвід</dt><dd>4 роки</dd>"),
    ("<dt>Focus</dt><dd>Product UI, design systems</dd>", "<dt>Фокус</dt><dd>Продуктовий UI, дизайн-системи</dd>"),
    ("<dt>Based in</dt><dd>Kyiv · UTC+3</dd>", "<dt>Локація</dt><dd>Київ · UTC+3</dd>"),
    # experience
    ('id="exp-h" class="label">Experience<', 'id="exp-h" class="label">Досвід<'),
    ("<span>UX/UI Designer, outsourced</span>", "<span>UX/UI дизайнер, аутсорс</span>"),
    ("<span>UX/UI Designer, team of 6</span>", "<span>UX/UI дизайнер, команда з 6 людей</span>"),
    ("App UX and UI, UI kit, clickable prototypes for user tests.", "UX і UI застосунку, UI kit, клікабельні прототипи для тестів з користувачами."),
    ("Host onboarding, booking page builder, guest check-in. Author of the design system.",
     "Онбординг для власників, конструктор сторінки бронювання, заселення гостей. Автор дизайн-системи."),
    ("Competitor research, user interviews and synthesis, MVP screens.", "Аналіз конкурентів, інтерв'ю з користувачами та синтез, екрани MVP."),
    # ai
    ('id="ai-h" class="label">How I use AI<', 'id="ai-h" class="label">Як я працюю з AI<'),
    ("AI speeds up the making. <em>The judgement stays mine.</em>", "AI пришвидшує роботу. <em>Рішення ухвалюю я.</em>"),
    ("<h3>Live prototypes in code</h3><p>I build working versions with Claude to judge motion and interaction in the browser. The Diamonds VPN site is one: Three.js, GSAP, no static mockups.</p>",
     "<h3>Живі прототипи в коді</h3><p>Збираю робочі версії з Claude, щоб оцінити анімацію і взаємодію в браузері. Приклад — сайт Diamonds VPN: Three.js, GSAP і жодних статичних макетів.</p>"),
    ("<h3>Clickable flows for founders</h3><p>For PostPixel I turned Figma flows into HTML prototypes the founder can test with real users.</p>",
     "<h3>Клікабельні сценарії для фаундерів</h3><p>Для PostPixel я перетворив сценарії з Figma на HTML-прототипи, які фаундер може тестувати з реальними користувачами.</p>"),
    ("<h3>Faster research and writing</h3><p>Competitor scans, first drafts and UX audits go faster with AI. I check every result and make the decisions myself.</p>",
     "<h3>Швидші дослідження й тексти</h3><p>З AI швидше йдуть огляди конкурентів, перші чернетки та UX-аудити. Кожен результат я перевіряю, а рішення ухвалюю сам.</p>"),
    # skills
    ('id="skills-h" class="label">Skills &amp; tools<', 'id="skills-h" class="label">Навички та інструменти<'),
    ("<h3>Design</h3><ul><li>Product UI</li><li>Design systems</li><li>User flows &amp; IA</li><li>Prototyping</li></ul>",
     "<h3>Дизайн</h3><ul><li>Продуктовий UI</li><li>Дизайн-системи</li><li>Сценарії та IA</li><li>Прототипування</li></ul>"),
    ("<h3>Research</h3><ul><li>User interviews</li><li>Synthesis</li><li>Competitor analysis</li><li>UX audits</li></ul>",
     "<h3>Дослідження</h3><ul><li>Інтерв'ю з користувачами</li><li>Синтез</li><li>Аналіз конкурентів</li><li>UX-аудити</li></ul>"),
    ("<h3>Tools</h3><ul><li>Figma &amp; FigJam</li><li>Framer</li><li>Claude</li><li>HTML, CSS, GSAP with AI</li></ul>",
     "<h3>Інструменти</h3><ul><li>Figma і FigJam</li><li>Framer</li><li>Claude</li><li>HTML, CSS, GSAP з AI</li></ul>"),
    # contact
    ('<span class="win-title">new message</span>', '<span class="win-title">нове повідомлення</span>'),
    ("Let's make something <em>clear</em>.", "Зробімо щось <em>зрозуміле</em>."),
    ("Open to product design roles in Ukraine and remote.", "Відкритий до ролей у продуктовому дизайні в Україні та віддалено."),
    ('<span class="btn-hint">Copy</span>', '<span class="btn-hint">Копіювати</span>'),
    ('data-todo="cv" target="_blank" rel="noopener">CV ↗<', 'data-todo="cv" target="_blank" rel="noopener">Резюме ↗<'),
    # footer
    ("<p>© 2026 Oleksandr Chykhaiev</p>", "<p>© 2026 Олександр Чихаєв</p>"),
    ("Designed by me, built with Claude.", "Мій дизайн, зібрано з Claude."),
    (">Back to top ↑<", ">Нагору ↑<"),
]

out = src
missing = []
for en, uk in T:
    if en not in out:
        missing.append(en[:70])
    out = out.replace(en, uk)
if missing:
    sys.exit("Not found in index.html (update tools/build_uk.py):\n  " + "\n  ".join(missing))

(ROOT / "uk").mkdir(exist_ok=True)
(ROOT / "uk" / "index.html").write_text(out, encoding="utf-8")
print("uk/index.html built,", len(T), "phrases")
