"""Builds the animated SVGs used by the README (assets/readme/*.svg).

Everything is embedded (font subsets as WOFF, no images, no script), so GitHub can show
each SVG as an <img> and the CSS animation still runs. Positions come straight from
data.js through node, so the drawings always match the catalog.

usage: python -I tests/make-readme-svgs.py            (needs fontTools and node)
"""
import base64, io, json, math, os, subprocess, sys
from xml.sax.saxutils import escape
from fontTools.ttLib import TTFont
from fontTools import subset

STATIC = False
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'readme')
os.makedirs(OUT, exist_ok=True)

C = dict(bg='#0F0E0C', card='#15130F', card2='#1A1814', ink='#F1EADC', ink2='#CBC2B2', muted='#918877',
         faint='#5f584c', acc='#F06A43', acc2='#F4A184', line='rgba(241,234,220,.13)', line2='rgba(241,234,220,.28)',
         ok='#3fa86a')

FONTS = {'SR': ('InstrumentSerif-Regular.ttf', None), 'SI': ('InstrumentSerif-Italic.ttf', None),
         'T4': ('InterTight-Variable.ttf', 400), 'T6': ('InterTight-Variable.ttf', 600)}
_tt = {k: TTFont(os.path.join(ROOT, 'fonts', f)) for k, (f, _) in FONTS.items()}

# ---------- catalog ----------
IDS = ['kant', 'simone-de-beauvoir', 'lao-tse', 'nietzsche', 'lelia-gonzalez', 'epicuro']
js = ("const D=require('./data.js');const all=D.PH.concat(D.BR);"
      "console.log(JSON.stringify({axes:D.AXES,qs:D.QS.length,ph:D.PH.length,br:D.BR.length,"
      "t:%s.map(id=>{const p=all.find(x=>x.id===id);return {id,n:p.n,s:p.s,born:p.born,died:p.died,v:p.v}})}))" % json.dumps(IDS))
CAT = json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT).decode('utf-8'))
AXES, TH = CAT['axes'], CAT['t']


def year(b):
    return f'{-b} a.C.' if b < 0 else str(b)


def width(txt, fam, size):
    f = _tt[fam]; cmap = f.getBestCmap(); hm = f['hmtx']; upm = f['head'].unitsPerEm
    return sum(hm[cmap.get(ord(ch)) or cmap.get(ord('?'))][0] for ch in txt) * size / upm


class SVG:
    def __init__(self, w, h, title):
        self.w, self.h, self.title = w, h, title
        self.body, self.css, self.used, self.n = [], [], {k: set() for k in FONTS}, 0

    def id(self, p='k'):
        self.n += 1; return f'{p}{self.n}'

    def add(self, s): self.body.append(s)

    def text(self, x, y, txt, fam='T4', size=16, fill=C['ink'], anchor='start', ls=0, extra=''):
        self.used[fam].update(txt)
        a = f' text-anchor="{anchor}"' if anchor != 'start' else ''
        l = f' letter-spacing="{ls}"' if ls else ''
        return f'<text x="{x:.1f}" y="{y:.1f}" class="{fam}" font-size="{size}" fill="{fill}"{a}{l}{extra}>{escape(txt)}</text>'

    def kf(self, frames, dur, prop_css, extra=''):
        """frames: list of (pct, css). returns class name."""
        if STATIC:
            return 'st'
        k, c = self.id('k'), self.id('c')
        body = ''.join(f'{p:.3f}%{{{css}}}' for p, css in frames)
        self.css.append(f'@keyframes {k}{{{body}}}.{c}{{animation:{k} {dur}s {prop_css} infinite both;{extra}}}')
        return c

    def font_css(self):
        out = []
        for k, (f, wght) in FONTS.items():
            if not self.used[k]:
                continue
            opts = subset.Options(); opts.flavor = 'woff'; opts.layout_features = ['kern']
            opts.name_IDs = []; opts.notdef_outline = True
            s = subset.Subsetter(opts)
            font = TTFont(os.path.join(ROOT, 'fonts', f))
            if wght is not None and 'fvar' in font:
                from fontTools.varLib import instancer
                font = instancer.instantiateVariableFont(font, {'wght': wght})
            s.populate(text=''.join(sorted(self.used[k])) + ' '); s.subset(font)
            b = io.BytesIO(); font.flavor = 'woff'; font.save(b)
            data = base64.b64encode(b.getvalue()).decode()
            out.append(f"@font-face{{font-family:'F{k}';src:url(data:font/woff;base64,{data}) format('woff')}}")
            style = 'font-style:italic;' if k == 'SI' else ''
            out.append(f".{k}{{font-family:'F{k}',serif;{style}font-variant-ligatures:none}}")
        return ''.join(out)

    def save(self, name):
        css = self.font_css() + ''.join(self.css) + \
            '@media (prefers-reduced-motion:reduce){*{animation-duration:0s!important;animation-delay:0s!important}}'
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" '
               f'role="img"><title>{escape(self.title)}</title><style>{css}</style>'
               f'<rect width="{self.w}" height="{self.h}" rx="22" fill="{C["bg"]}"/>' + ''.join(self.body) + '</svg>')
        p = os.path.join(OUT if not STATIC else os.environ.get('TEMP', OUT), name)
        open(p, 'w', encoding='utf-8').write(svg)
        print(f'{name}: {len(svg) // 1024} KB')


def slide_frames(i, n, fade=0.035, hold_from=None):
    """Opacity frames: visible only during slide i of n."""
    a, b = i / n * 100, (i + 1) / n * 100
    f = fade * 100
    fr = [(0, 'opacity:0')]
    if a > 0:
        fr += [(a, 'opacity:0')]
    fr += [(a + f, 'opacity:1'), (b - f, 'opacity:1'), (b, 'opacity:0')]
    if b < 100:
        fr += [(100, 'opacity:0')]
    if a == 0:
        fr = [(0, 'opacity:0'), (f, 'opacity:1'), (b - f, 'opacity:1'), (b, 'opacity:0'), (100, 'opacity:0')]
    return fr


def mandala_pts(v, cx, cy, R):
    pts = []
    for i, x in enumerate(v):
        a = -math.pi / 2 + i * 2 * math.pi / 11
        c = max(-1.35, min(1.35, x)); r = R * (0.52 + c * 0.34)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def poly_len(pts):
    return sum(math.dist(pts[i], pts[(i + 1) % len(pts)]) for i in range(len(pts)))


# ---------- hero ----------
def hero():
    W, H = 1200, 600
    s = SVG(W, H, 'Filosofômetro: o teste de filosofia que mostra a conta. A mandala dos 11 temas desenha, um por vez, '
                  'o formato de pensar de Kant, Simone de Beauvoir, Lao Tsé, Nietzsche, Lélia Gonzalez e Epicuro.')
    s.add(f'<defs><radialGradient id="g" cx="78%" cy="30%" r="60%"><stop offset="0" stop-color="{C["acc"]}" stop-opacity=".16"/>'
          f'<stop offset="1" stop-color="{C["acc"]}" stop-opacity="0"/></radialGradient></defs>'
          f'<rect width="{W}" height="{H}" rx="22" fill="url(#g)"/>')
    # logo
    s.add(f'<g transform="translate(64,58)"><path d="M13 0 26 23H0z" fill="none" stroke="{C["ink"]}" stroke-width="1.6" '
          f'stroke-linejoin="round"/><circle cx="13" cy="15.5" r="3" fill="{C["acc"]}"/></g>')
    s.add(s.text(100, 80, 'Filosofômetro', 'SR', 30))
    s.add(f'<line x1="64" y1="146" x2="98" y2="146" stroke="{C["ink2"]}" stroke-opacity=".7"/>')
    s.add(s.text(112, 151, 'TESTE FILOSÓFICO · CÓDIGO ABERTO', 'T6', 13, C['ink2'], ls=2.2))
    s.add(s.text(60, 232, 'O teste de filosofia', 'SR', 74, extra=' letter-spacing="-1"'))
    s.add(s.text(60, 312, 'que mostra a conta.', 'SI', 74, C['acc'], extra=' letter-spacing="-1"'))
    for k, line in enumerate(['Responda afirmações do dia a dia sobre verdade, liberdade,',
                              'moral e poder. Descubra qual pensador tem o formato de',
                              'pensar mais parecido com o seu. São 180, em três idiomas.']):
        s.add(s.text(64, 376 + k * 29, line, 'T4', 19, C['ink2']))
    # pill buttons
    s.add(f'<rect x="64" y="476" width="190" height="52" rx="26" fill="{C["acc"]}"/>')
    s.add(s.text(159, 508, 'Fazer o teste  →', 'T6', 17, '#140B07', 'middle'))
    s.add(f'<rect x="268" y="476" width="232" height="52" rx="26" fill="none" stroke="{C["line2"]}"/>')
    s.add(s.text(384, 508, 'filosofometro.com.br', 'T6', 16, C['ink'], 'middle'))
    s.add(s.text(64, 566, 'Grátis · sem cadastro · português, inglês e espanhol', 'T4', 14, C['muted']))
    # mandala
    cx, cy, R = 905, 244, 156
    g = [f'<g stroke="{C["line"]}" fill="none">']
    for f in (0.25, 0.5, 0.75, 1, 1.16):
        g.append(f'<circle cx="{cx}" cy="{cy}" r="{R * f:.1f}"/>')
    for i in range(11):
        a = -math.pi / 2 + i * 2 * math.pi / 11
        g.append(f'<line x1="{cx}" y1="{cy}" x2="{cx + R * math.cos(a):.1f}" y2="{cy + R * math.sin(a):.1f}"/>')
    g.append('</g>')
    s.add(''.join(g))
    for i, ax in enumerate(AXES):
        a = -math.pi / 2 + i * 2 * math.pi / 11
        x, y = cx + R * 1.3 * math.cos(a), cy + R * 1.3 * math.sin(a) + 5
        anc = 'middle' if abs(x - cx) < 20 else ('start' if x > cx else 'end')
        s.add(s.text(x, y, ax['name'], 'T4', 13, C['muted'], anc))
    n, dur = len(TH), 3.4 * len(TH)
    for i, t in enumerate(TH[:1] if STATIC else TH):
        pts = mandala_pts(t['v'], cx, cy, R)
        L = math.ceil(poly_len(pts))
        a, b = i / n * 100, (i + 1) / n * 100
        span = b - a
        vis = s.kf(slide_frames(i, n, 0.025), dur, 'linear')
        draw = s.kf([(0, f'stroke-dashoffset:{L};fill-opacity:0'), (a, f'stroke-dashoffset:{L};fill-opacity:0'),
                     (a + span * .42, 'stroke-dashoffset:0;fill-opacity:0'), (a + span * .6, 'stroke-dashoffset:0;fill-opacity:.16'),
                     (100, 'stroke-dashoffset:0;fill-opacity:.16')], dur, 'cubic-bezier(.6,0,.2,1)')
        d = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
        dots = ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="{C["acc"]}"/>' for x, y in pts)
        s.add(f'<g class="{vis}"><polygon class="{draw}" points="{d}" fill="{C["acc"]}" fill-opacity=".16" '
              f'stroke="{C["acc"]}" stroke-width="2.6" stroke-linejoin="round" stroke-dasharray="{'none' if STATIC else L}"/>{dots}')
        # name card
        nm = t['n']; sub = f"{t['s']} · {year(t['born'])} a {year(t['died']) if t.get('died') else 'hoje'}"
        cw = max(width(nm, 'SI', 34), width(sub, 'T4', 14)) + 48
        s.add(f'<rect x="{cx - cw / 2:.1f}" y="{cy + R * 1.3 + 28:.1f}" width="{cw:.1f}" height="86" rx="16" fill="{C["card"]}" '
              f'stroke="{C["line"]}"/>')
        s.add(s.text(cx, cy + R * 1.3 + 68, nm, 'SI', 34, C['acc'], 'middle'))
        s.add(s.text(cx, cy + R * 1.3 + 96, sub, 'T4', 14, C['ink2'], 'middle'))
        s.add('</g>')
    s.save('hero-estatico.svg' if STATIC else 'hero.svg')


# ---------- the 11 themes ----------
def eixos():
    W, rowh, top = 1200, 46, 150
    H = top + rowh * 11 + 70
    s = SVG(W, H, 'Os 11 temas do Filosofômetro, cada um com dois lados: Razão ou Experiência, Destino ou Liberdade, '
                  'Sentido dado ou Sentido criado, Dever ou Consequência, Indivíduo ou Comunidade, Prazer ou Virtude, '
                  'Matéria ou Espírito, Certeza ou Dúvida, Tradição ou Ruptura, Aceitar ou Resistir, Autoridade ou Autonomia. '
                  'O ponto laranja mostra, um por vez, onde cada pensador fica.')
    s.add(f'<line x1="56" y1="58" x2="90" y2="58" stroke="{C["ink2"]}" stroke-opacity=".7"/>')
    s.add(s.text(104, 63, 'O MAPA', 'T6', 13, C['ink2'], ls=2.2))
    s.add(s.text(54, 120, 'Onze tensões que definem', 'SR', 48))
    s.add(s.text(54 + width('Onze tensões que definem ', 'SR', 48), 120, 'um pensamento.', 'SI', 48, C['acc']))
    n, dur = len(TH), 3.2 * len(TH)
    # thinker name, top right
    for i, t in enumerate(TH):
        c = s.kf(slide_frames(i, n, 0.03), dur, 'linear')
        s.add(f'<g class="{c}">' + s.text(W - 56, 82, t['n'], 'SI', 34, C['acc'], 'end') +
              s.text(W - 56, 110, t['s'], 'T4', 14, C['muted'], 'end') + '</g>')
    x0, x1 = 470, 780
    for r, ax in enumerate(AXES):
        y = top + r * rowh
        s.add(f'<line x1="54" y1="{y + rowh}" x2="{W - 54}" y2="{y + rowh}" stroke="{C["line"]}"/>')
        if r == 0:
            s.add(f'<line x1="54" y1="{y}" x2="{W - 54}" y2="{y}" stroke="{C["line"]}"/>')
        mid = y + rowh / 2
        s.add(s.text(56, mid + 5, f'{r + 1:02d}', 'T4', 12, C['faint']))
        s.add(s.text(100, mid + 9, ax['l'], 'SR', 28))
        s.add(s.text(W - 56, mid + 9, ax['r'], 'SR', 28, anchor='end'))
        s.add(f'<line x1="{x0}" y1="{mid + 7}" x2="{x1}" y2="{mid + 7}" stroke="{C["line2"]}" stroke-dasharray="3 5"/>')
        lw = width(ax['name'].upper(), 'T6', 10) + 1.6 * len(ax['name']) + 16
        s.add(s.text((x0 + x1) / 2, mid - 6, ax['name'].upper(), 'T6', 9.5, C['muted'], 'middle', ls=1.6).replace('y="', 'y="', 1))
        # moving dot: one keyframe stop per thinker
        P = [f"transform:translateX({t['v'][r] * (x1 - x0) / 2:.1f}px)" for t in TH]
        fr = [(0, P[-1])]
        for i in range(n):
            a, b = i / n * 100, (i + 1) / n * 100
            fr += [(a + (b - a) * .16, P[i]), (b, P[i])]
        c = s.kf(fr, dur, 'cubic-bezier(.5,0,.2,1)')
        cxm = (x0 + x1) / 2
        s.add(f'<g class="{c}"><circle cx="{cxm}" cy="{mid + 7}" r="10" fill="{C["acc"]}" fill-opacity=".2"/>'
              f'<circle cx="{cxm}" cy="{mid + 7}" r="6" fill="{C["acc"]}"/></g>')
    s.add(s.text(56, H - 28, 'Cada tema tem 4, 8 ou 12 afirmações, metade puxando para cada lado. Posições dos pensadores: data.js.',
                 'T4', 14, C['muted']))
    s.save('eixos.svg')


# ---------- audit ----------
def auditoria():
    W, H = 1200, 610
    s = SVG(W, H, 'Auditoria: o motor (engine.js) e um verificador independente (verify.js), sem código em comum, refazem a '
                  'conta do resultado de exemplo do site e conferem cada número: catálogo, código, constantes, 132 de 132 respostas, '
                  '11 de 11 temas, normalização, 104 de 104 posições no ranking geral e 27 de 27 no brasileiro. Tudo confere: '
                  'Kant, 93% de afinidade.')
    s.add(f'<line x1="56" y1="58" x2="90" y2="58" stroke="{C["ink2"]}" stroke-opacity=".7"/>')
    s.add(s.text(104, 63, 'AUDITORIA', 'T6', 13, C['ink2'], ls=2.2))
    s.add(s.text(54, 120, 'Duas contas,', 'SR', 48))
    s.add(s.text(54 + width('Duas contas, ', 'SR', 48), 120, 'o mesmo resultado.', 'SI', 48, C['acc']))
    # two engines
    for k, (fn, sub) in enumerate([('engine.js', 'o motor do site'), ('verify.js', 'escrito do zero, sem código em comum')]):
        y = 176 + k * 112
        s.add(f'<rect x="56" y="{y}" width="340" height="92" rx="16" fill="{C["card"]}" stroke="{C["line"]}"/>')
        s.add(s.text(80, y + 40, fn, 'T6', 22, C['acc2']))
        s.add(s.text(80, y + 68, sub, 'T4', 15, C['muted']))
    s.add(f'<path d="M396 222 C 440 222, 440 300, 470 300 M396 334 C 440 334, 440 300, 470 300" fill="none" '
          f'stroke="{C["line2"]}" stroke-width="1.5"/>')
    s.add(s.text(56, 430, 'Código do resultado', 'T4', 14, C['muted']))
    s.add(s.text(56, 456, '1213403024110403333340021011312…', 'T4', 17, C['ink2']))
    s.add(s.text(56, 494, 'motor v1.2.0 · catálogo 503c9e4e · código 554efb62', 'T4', 14, C['muted']))
    rows = [('Catálogo igual ao atual', '503c9e4e = 503c9e4e'), ('Código do motor igual ao atual', '554efb62 = 554efb62'),
            ('Constantes iguais às do método', 'τ = 0,77 · mín = 0,05 · teto = 3'), ('Respostas, valores e contribuições', '132 de 132 conferem'),
            ('Posição nos 11 temas', '11 de 11 conferem'), ('Normalização do perfil', 'fator 1,332292 = 1,332292'),
            ('Ranking geral: ordem, distâncias e percentuais', '104 de 104 conferem'), ('Ranking brasileiro', '27 de 27 conferem')]
    X, Y0, rh = 486, 168, 40
    s.add(f'<rect x="{X - 14}" y="{Y0 - 14}" width="{W - 56 - X + 14}" height="{rh * len(rows) + 14}" rx="16" fill="{C["card"]}" stroke="{C["line"]}"/>')
    n = len(rows); dur = 12.0
    for i, (a, b) in enumerate(rows):
        y = Y0 + i * rh
        if i:
            s.add(f'<line x1="{X}" y1="{y - 4}" x2="{W - 70}" y2="{y - 4}" stroke="{C["line"]}"/>')
        t0 = 6 + i * 6.5
        c = s.kf([(0, 'opacity:.25'), (t0, 'opacity:.25'), (t0 + 2, 'opacity:1'), (92, 'opacity:1'), (97, 'opacity:.25'), (100, 'opacity:.25')], dur, 'linear')
        tick = s.kf([(0, 'transform:scale(0)'), (t0, 'transform:scale(0)'), (t0 + 2.5, 'transform:scale(1.15)'), (t0 + 4, 'transform:scale(1)'),
                     (92, 'transform:scale(1)'), (97, 'transform:scale(0)'), (100, 'transform:scale(0)')], dur, 'ease-out',
                    'transform-box:fill-box;transform-origin:center')
        s.add(f'<g class="{c}">' + s.text(X + 40, y + 22, a, 'T6', 16, C['ink']) + s.text(W - 80, y + 22, b, 'T4', 14, C['muted'], 'end') + '</g>')
        s.add(f'<g class="{tick}"><circle cx="{X + 14}" cy="{y + 16}" r="11" fill="{C["ok"]}"/>'
              f'<path d="M{X + 8.5} {y + 16.5} l3.6 3.6 l7-7.6" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></g>')
    yb = Y0 + rh * n + 22
    fin = s.kf([(0, 'opacity:0;transform:translateY(8px)'), (60, 'opacity:0;transform:translateY(8px)'), (64, 'opacity:1;transform:none'),
                (92, 'opacity:1;transform:none'), (97, 'opacity:0'), (100, 'opacity:0')], dur, 'ease-out')
    s.add(f'<g class="{fin}"><rect x="{X - 14}" y="{yb}" width="{W - 56 - X + 14}" height="58" rx="14" fill="#16261c" stroke="{C["ok"]}" stroke-opacity=".5"/>'
          + s.text(X + 10, yb + 36, 'Tudo confere.', 'T6', 18, C['ink'])
          + s.text(X + 10 + width('Tudo confere. ', 'T6', 18), yb + 36, 'Os dois chegam aos mesmos números: Kant, 93% de afinidade.', 'T4', 17, C['ink2']) + '</g>')
    s.save('auditoria.svg')


STATIC = False
hero(); eixos(); auditoria()
if '--og' in sys.argv:
    STATIC = True; OUT = os.environ.get('TEMP', OUT); hero()
