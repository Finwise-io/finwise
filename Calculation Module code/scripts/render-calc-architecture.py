# Renders the engine-level architecture as one self-contained HTML page.
# The data comes from calc-architecture.py; this file holds only layout.
import json, html, collections

d=json.load(open('docs/architecture/calc-module-map.json'))
E=d['engines']
by_layer=collections.defaultdict(list)
for x in E: by_layer[x['layer']].append(x)

PART_HUE={'Net worth':'#0A6752','Performance':'#1B4D8F','Cash flow':'#7A4A9E','Accounts & connections':'#8A5A00',
 'Plan & retirement':'#9B2C6B','Debt':'#A34423','Market data':'#3B7A8A','Foundation':'#5B6770',
 'Insights':'#4A7A2E','Setup':'#6B5AA0','Other':'#777'}
STATUS_CLASS={'DEFECT':'defect','UNRESOLVED':'defect','YOUR CALL':'call','CHECKED vs REAL DATA':'checked'}
LAYER_NAME={1:'reads raw data',2:'built from layer 1',3:'built from layer 2',4:'built from layer 3',
 5:'built from layer 4',6:'built from layer 5',7:'built from layer 6',8:'built from layer 7',9:'the top — the odds'}

def box(x):
    cls=STATUS_CLASS.get(x['status'],'pinned')
    feeds=', '.join(x['feeds_from'][:4]) + (' …' if len(x['feeds_from'])>4 else '')
    tip=html.escape(f"{x['answers']}  ·  probe: {x['probe'] or '—'}  ·  {x['source']}")
    return (f'<div class="box {cls}" style="--hue:{PART_HUE.get(x["part"],"#777")}" data-part="{html.escape(x["part"])}" title="{tip}">'
            f'<span class="nm">{html.escape(x["engine"])}</span>'
            + (f'<span class="ff">← {html.escape(feeds)}</span>' if feeds else '<span class="ff raw">raw data in</span>')
            + '</div>')

layers_html=[]
for L in sorted(by_layer, reverse=True):
    items=sorted(by_layer[L], key=lambda x:(x['part'],x['engine']))
    layers_html.append(
        f'<section class="layer"><header><b>Layer {L}</b><span>{LAYER_NAME.get(L,"")}</span>'
        f'<em>{len(items)} engine{"s" if len(items)!=1 else ""}</em></header>'
        f'<div class="grid">{"".join(box(x) for x in items)}</div></section>')

counts=collections.Counter(x['part'] for x in E)
legend=''.join(f'<button class="lg" style="--hue:{PART_HUE[p]}" onclick="flt(this,{json.dumps(p)})">{p} <b>{n}</b></button>'
               for p,n in counts.most_common())
n_def=sum(1 for x in E if x['status'] in ('DEFECT','UNRESOLVED'))
n_call=sum(1 for x in E if x['status']=='YOUR CALL')
n_chk=sum(1 for x in E if x['status']=='CHECKED vs REAL DATA')

page=f'''<title>Calculation Module Architecture</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{{--ink:#121917;--ink2:#3D4A46;--muted:#687671;--paper:#F7F9F8;--card:#FFFFFF;--line:#DFE7E3;--line2:#EDF2F0;
--accent:#085041;--red:#9B2C2C;--redsoft:#F7E6E6;--amber:#8A5A00;--ambersoft:#F6EEDC;--oksoft:#E6EFEB;--chk:#0A6752}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--ink:#EAF1EE;--ink2:#B9C7C2;--muted:#8B9A95;
--paper:#0D1412;--card:#141D1A;--line:#28352F;--line2:#1D2825;--accent:#5FC0A3;--red:#E08585;--redsoft:#331A1A;
--amber:#D9A441;--ambersoft:#32280F;--oksoft:#16302A;--chk:#5FC0A3}}}}
:root[data-theme="dark"]{{--ink:#EAF1EE;--ink2:#B9C7C2;--muted:#8B9A95;--paper:#0D1412;--card:#141D1A;--line:#28352F;
--line2:#1D2825;--accent:#5FC0A3;--red:#E08585;--redsoft:#331A1A;--amber:#D9A441;--ambersoft:#32280F;--oksoft:#16302A;--chk:#5FC0A3}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 "IBM Plex Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1180px;margin:0 auto;padding:clamp(28px,4vw,56px) clamp(16px,4vw,36px) 90px}}
h1{{font:400 clamp(34px,5.4vw,52px)/1.05 "Instrument Serif",Georgia,serif;letter-spacing:-.015em;margin:0 0 8px;text-wrap:balance}}
.eyebrow{{font:11.5px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap}}
.stand{{color:var(--ink2);max-width:70ch;font-size:17.5px;margin:0 0 6px}}
.stamp{{font:11.5px "IBM Plex Mono",monospace;color:var(--muted);display:flex;gap:16px;flex-wrap:wrap;margin-top:14px}}
.mast{{border-bottom:2px solid var(--ink);padding-bottom:20px;margin-bottom:26px}}
.legend{{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 6px}}
.lg{{font:11px "IBM Plex Mono",monospace;letter-spacing:.04em;border:1px solid var(--line);background:var(--card);
color:var(--ink2);border-radius:20px;padding:5px 12px;cursor:pointer}}
.lg b{{color:var(--hue)}}
.lg.on{{border-color:var(--hue);box-shadow:inset 0 0 0 1px var(--hue)}}
.keys{{display:flex;gap:16px;flex-wrap:wrap;margin:8px 0 22px;font-size:12.5px;color:var(--muted)}}
.keys i{{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px;border:1px solid var(--line)}}
.layer{{border:1px solid var(--line);border-radius:8px;background:var(--card);margin-bottom:14px;overflow:hidden;
box-shadow:0 1px 2px rgba(0,0,0,.04)}}
.layer header{{display:flex;gap:12px;align-items:baseline;padding:10px 16px;background:var(--line2);border-bottom:1px solid var(--line)}}
.layer header b{{font-size:13.5px}}
.layer header span{{font:11px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}}
.layer header em{{margin-left:auto;font-style:normal;font:11px "IBM Plex Mono",monospace;color:var(--muted)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:1px;background:var(--line)}}
.box{{background:var(--card);padding:10px 12px 9px;border-left:3px solid var(--hue);min-height:52px}}
.box .nm{{display:block;font:500 11.5px "IBM Plex Mono",monospace;color:var(--ink)}}
.box .ff{{display:block;font:10.5px "IBM Plex Mono",monospace;color:var(--muted);margin-top:5px;line-height:1.5;word-break:break-word}}
.box .ff.raw{{color:var(--hue);opacity:.75}}
.box.defect{{background:var(--redsoft)}} .box.defect .nm{{color:var(--red)}}
.box.call{{background:var(--ambersoft)}} .box.call .nm{{color:var(--amber)}}
.box.checked{{background:var(--oksoft)}} .box.checked .nm{{color:var(--chk)}}
.box.dim{{opacity:.16}}
.note{{border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:6px;background:var(--card);
padding:14px 18px;max-width:74ch;margin:26px 0 0;font-size:14.5px;color:var(--ink2)}}
footer{{margin-top:48px;padding-top:18px;border-top:1px solid var(--line);font:11.5px "IBM Plex Mono",monospace;color:var(--muted)}}
</style>
<div class="wrap">
<header class="mast">
<div class="eyebrow"><span>MoneyKeel</span><span>Calculation Module</span><span>engine architecture · generated</span></div>
<h1>Every engine, and what feeds it</h1>
<p class="stand">All {len(E)} calculations, stacked by build order. Read from the bottom: layer&nbsp;1 touches
raw data and nothing else; each layer above is built only from the ones beneath it; the retirement odds sit alone
at the top with every ingredient already explained. Click a family to follow it through the layers.</p>
<div class="stamp"><span>18 August 2026</span><span>·</span><span>{n_def} need a fix or decision</span><span>·</span>
<span>{n_call} rest on a choice we made</span><span>·</span><span>{n_chk} checked against real institution data</span></div>
</header>
<div class="legend">{legend}</div>
<div class="keys">
<span><i style="background:var(--card)"></i>pinned by a test</span>
<span><i style="background:var(--redsoft)"></i>needs a fix or decision</span>
<span><i style="background:var(--ambersoft)"></i>your call — a threshold we chose</span>
<span><i style="background:var(--oksoft)"></i>checked against real data</span>
</div>
{''.join(layers_html)}
<div class="note"><b>How to read a box.</b> The name is the engine as the master file names it; beneath it,
what it is built from — <i>raw data in</i> means it reads the outside world directly. Hover for what it answers
and where it lives. The colour stripe is its family; the fill is how much we know.</div>
<footer>Generated from calculation-inventory-v1.xlsx · rebuild: python3 "Calculation Module code/scripts/calc-architecture.py"
&amp;&amp; python3 "Calculation Module code/scripts/render-calc-architecture.py" · hand edits are overwritten</footer>
</div>
<script>
let cur=null;
function flt(btn,part){{
  const on = cur!==part; cur = on?part:null;
  document.querySelectorAll('.lg').forEach(b=>b.classList.toggle('on', on&&b===btn));
  document.querySelectorAll('.box').forEach(x=>x.classList.toggle('dim', on && x.dataset.part!==part));
}}
</script>'''
open('Calculation Module/calc-module-architecture-v1-2026-08-18.html','w').write(page)
print(f"rendered · {len(E)} boxes across {len(by_layer)} layers")
