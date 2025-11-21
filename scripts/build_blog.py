#!/usr/bin/env python3
import os, re, json, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT=os.path.join(ROOT,'content','blog')
OUT_DIR=os.path.join(ROOT,'site','blog')
os.makedirs(CONTENT,exist_ok=True)
os.makedirs(OUT_DIR,exist_ok=True)
def read_md(path):
  with open(path,'r',encoding='utf-8') as f:
    return f.read()
def md_to_html(md):
  md=md.replace('\r\n','\n')
  lines=md.split('\n')
  title='' if not lines else re.sub(r'^#\s*', '', lines[0])
  body='\n'.join(lines[1:])
  body=re.sub(r'^##\s*(.*)$', r'<h2>\1</h2>', body, flags=re.MULTILINE)
  body=re.sub(r'^###\s*(.*)$', r'<h3>\1</h3>', body, flags=re.MULTILINE)
  body=re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', body)
  body=re.sub(r'\*(.*?)\*', r'<em>\1</em>', body)
  body=re.sub(r'`([^`]+)`', r'<code>\1</code>', body)
  body=re.sub('\n\n+',r'</p><p>',f'<p>{body}</p>')
  return title,body
def wrap(title,body,slug,date):
  canonical=f'https://nodaysidle.com/blog/{slug}.html'
  ogimg='https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop'
  ld={"@context":"https://schema.org","@type":"Article","headline":title,"datePublished":date,"author":{"@type":"Organization","name":"NODAYSIDLE"},"mainEntityOfPage":canonical}
  return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title} — NODAYSIDLE</title><link rel="stylesheet" href="/styles.css"><link rel="canonical" href="{canonical}"><meta property="og:title" content="{title}"><meta property="og:description" content="NODAYSIDLE Blog"><meta property="og:type" content="article"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{ogimg}"><script type="application/ld+json">{json.dumps(ld)}</script></head><body><header class="container header"><a href="/index.html" class="logo"><img src="/assets/images/logo.svg" alt="NODAYSIDLE"/></a><nav class="nav"><a href="/index.html">Home</a><a href="/catalog.html">Store</a><a href="/blog/">Blog</a><a href="/account.html">Account</a><a href="/cart.html" class="cta">Cart <span class="cart-badge"></span></a></nav></header><main class="container"><nav class="breadcrumbs"><a href="/index.html" class="link">Home</a> › <a href="/blog/" class="link">Blog</a> › <span>{title}</span></nav><article class="neo-raised card"><h1>{title}</h1><div class="muted">{date}</div>{body}</article></main><footer class="container footer"><div>© NODAYSIDLE — Slovenia</div><div><a href="mailto:info@nodaysidle.com" class="link">info@nodaysidle.com</a></div></footer><script src="/js/analytics.js"></script><script src="/js/app.js"></script></body></html>'''
posts=[]
for name in sorted(os.listdir(CONTENT)):
  if not name.endswith('.md'): continue
  path=os.path.join(CONTENT,name)
  md=read_md(path)
  title,body=md_to_html(md)
  date=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
  slug=re.sub('[^a-z0-9]+','-',title.strip().lower()).strip('-') or os.path.splitext(name)[0]
  html=wrap(title,body,slug,date)
  out=os.path.join(OUT_DIR,f'{slug}.html')
  with open(out,'w',encoding='utf-8') as f: f.write(html)
  posts.append({"title":title,"slug":slug,"date":date})
posts.sort(key=lambda x:x["date"],reverse=True)
items=''.join([f'<li><a class="link" href="/blog/{p["slug"]}.html">{p["title"]}</a> <span class="muted">{p["date"]}</span></li>' for p in posts])
index=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NODAYSIDLE Blog</title><link rel="stylesheet" href="/styles.css"><link rel="canonical" href="https://nodaysidle.com/blog/"><meta property="og:title" content="NODAYSIDLE Blog"><meta property="og:description" content="Updates and insights from NODAYSIDLE"><meta property="og:type" content="website"><meta property="og:url" content="https://nodaysidle.com/blog/"></head><body><header class="container header"><a href="/index.html" class="logo"><img src="/assets/images/logo.svg" alt="NODAYSIDLE"/></a><nav class="nav"><a href="/index.html">Home</a><a href="/catalog.html">Store</a><a href="/blog/" class="active">Blog</a><a href="/account.html">Account</a><a href="/cart.html" class="cta">Cart <span class="cart-badge"></span></a></nav></header><main class="container"><section class="hero"><div class="container"><h1>NODAYSIDLE Blog</h1><p class="lead">Performance, reliability, and optimization notes.</p></div></section><section class="container neo-raised card"><ul>{items or '<li class="muted">No posts yet</li>'}</ul></section></main><footer class="container footer"><div>© NODAYSIDLE — Slovenia</div><div><a href="mailto:info@nodaysidle.com" class="link">info@nodaysidle.com</a></div></footer><script src="/js/analytics.js"></script><script src="/js/app.js"></script></body></html>'''
with open(os.path.join(OUT_DIR,'index.html'),'w',encoding='utf-8') as f: f.write(index)
