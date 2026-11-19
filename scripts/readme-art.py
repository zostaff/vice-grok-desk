"""Rebuild the vector README illustrations. Author: zostaff."""
from pathlib import Path
from html import escape
P = Path(__file__).resolve().parents[1] / 'assets'
P.mkdir(exist_ok=True)
INK='#f9f4fc'; MUTED='#aaa0b9'; PINK='#ff38a6'; MINT='#43efd0'
def text(x,y,s,size=18,color=INK,weight=400):
 return f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" font-weight="{weight}" font-family="DejaVu Sans,Arial,sans-serif">{escape(s)}</text>'
def line(x,y,x2,y2,color=MINT):
 return f'<path d="M{x} {y} L{x2} {y2}" fill="none" stroke="{color}" stroke-width="2"/>'
def box(x,y,w,h,stroke='#3b2a49'):
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="#16111e" stroke="{stroke}"/>'
def svg(name,h,body):
 P.joinpath(name+'.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{h}" viewBox="0 0 1200 {h}" role="img"><defs><linearGradient id="accent"><stop stop-color="{PINK}"/><stop offset="1" stop-color="{MINT}"/></linearGradient><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.7" fill="#3b2a49"/></pattern></defs><rect width="1200" height="{h}" rx="16" fill="#0c0912"/><rect width="1200" height="{h}" rx="16" fill="url(#grid)"/>{body}</svg>')
svg('divider',18,'<rect x="0" y="8" width="1200" height="2" fill="url(#accent)"/>')
sections=[('quick-start','BOOT THE DESK','01'),('rules','SIGNAL TO POSITION','02'),('replay','REPLAY THE TAPE','03'),('grok','GROK CLASSIFICATION','04'),('repository','UNDER THE HOOD','05'),('scope','SCOPE & NEXT STEPS','06')]
for slug,title,n in sections:
 svg('section-'+slug,94,text(28,60,n,40,MINT,700)+line(105,25,105,70,PINK)+text(130,59,title,29,INK,700)+text(1020,54,'VICE / DESK',14,MUTED))
b=text(36,48,'THE SIGNAL CHAIN',28,INK,700)+text(36,78,'Supplied source events in. Inspectable decisions out.',17,MUTED)
for y,label,c in [(130,'ROCKSTAR',PINK),(205,'GAMING',MINT),(280,'CT',PINK)]:
 b+=box(36,y,185,54)+text(55,y+34,label,20,c,700)+line(221,y+27,257,y+27,c)
b+=line(257,157,257,307)+line(257,232,295,232)
for x,num,title,sub1,sub2,c in [(295,'01','CONSENSUS','2 of 3 sources','60-second window',PINK),(590,'02','RISK FILTER','Snapshot checks','Fresh / momentum',MINT),(885,'03','PAPER DESK','Size + stop rules','Fees + slippage',PINK)]:
 b+=box(x,150,255,164,c)+text(x+20,185,num,17,c,700)+text(x+20,222,title,23,INK,700)+text(x+20,257,sub1,17,MUTED)+text(x+20,283,sub2,17,MUTED)
 if x<885:b+=line(x+255,232,x+285,232)
b+=box(295,365,845,65)+text(320,405,'JSONL JOURNAL',21,MINT,700)+text(550,405,'SIGNALS  /  REJECTIONS  /  ENTRIES  /  EXITS',17,MUTED)
for x in [422,717,1012]:b+=line(x,314,x,365,'#65405f')
b+=text(36,478,'RESEARCH CORE',14,MINT)+text(295,478,'Optional Grok classification operates on provided news text.',17,MUTED)
svg('pipeline',510,b)
b=text(32,43,'VICE GROK DESK',19,INK,700)+text(850,43,'PAPER / SYNTHETIC FIXTURE',16,PINK)+line(32,65,1168,65,'#3b2a49')
b+=text(34,110,'$ npm run demo',21,MINT)
rows=[('08:00:15','SIGNAL','gta6','rockstar + ct',MINT),('08:00:16','BUY','DEMO-A','fresh / paper position',MINT),('08:00:17','REJECT','DEMO-BUNDLED','bundled_launch',PINK),('08:00:18','REJECT','DEMO-UNKNOWN','dev_supply_or_unknown',PINK),('08:00:19','REJECT','DEMO-OLD','older_than_30_minutes',PINK),('08:00:20','BUY','DEMO-MOMENTUM','existing-token strategy',MINT),('08:00:30','SELL','DEMO-A','trailing_stop',MINT),('08:00:35','SELL','DEMO-MOMENTUM','hard_stop',PINK),('08:01:20','REJECT','DEMO-EXPIRED','no_active_consensus',PINK)]
for i,(t,a,m,r,c) in enumerate(rows):
 y=157+i*36;b+=text(34,y,t,18,MUTED)+text(180,y,a,18,c,700)+text(295,y,m,18)+text(660,y,r,18,MUTED)
b+=line(32,485,1168,485,'#3b2a49')+text(34,525,'2 ENTRIES',22,MINT,700)+text(260,525,'2 EXITS',22,INK,700)+text(470,525,'4 REJECTIONS',22,PINK,700)+text(34,565,'Illustration of the included demo journal. No real orders. No historical performance.',17,MUTED)
svg('terminal',595,b)
b=text(38,48,'TWO ROUTES. ONE RISK GATE.',27,INK,700)
for x,n,title,subtitle,detail,c in [(38,'A','FRESH LAUNCH','Age at most 30 minutes','New candidates only',PINK),(625,'B','MOMENTUM','Existing tokens allowed','No maximum token age',MINT)]:
 b+=box(x,83,537,160,c)+text(x+23,120,n,20,c,700)+text(x+65,120,title,24,INK,700)+text(x+23,171,subtitle,25,INK)+text(x+23,211,detail,18,MUTED)
b+=text(38,290,'BOTH REQUIRE',17,MINT,700)+text(38,327,'Active consensus  /  recent risk snapshot  /  known holdings and bundle status',20,INK)+text(38,363,'Unknown risk data rejects the candidate. Source snapshots are supplied upstream.',17,MUTED)
svg('strategies',398,b)
svg('footer',160,text(38,64,'READ THE SIGNAL. INSPECT THE RULES.',31,INK,700)+text(38,111,'GITHUB.COM/ZOSTAFF/VICE-GROK-DESK',18,MINT)+text(904,111,'BY ZOSTAFF / MIT',18,PINK))
