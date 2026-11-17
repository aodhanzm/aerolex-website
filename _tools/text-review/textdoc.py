#!/usr/bin/env python3
"""Website text review: pull every visible word of the website into ONE editable document, then push edits back.

  python textdoc.py extract <website-folder> <document.md>   # build (or refresh) the document
  python textdoc.py apply   <website-folder> <document.md>   # write your edits back into the pages

Nothing here publishes anything. 'apply' only rewrites files in the folder you point it at; you still
review the changes and say go before they are pushed live. Every block in the document carries a
fingerprint of the words it had when extracted; if a page changed in the meantime, that block is skipped
and reported instead of being overwritten.
"""
import hashlib, html, re, sys
from html.parser import HTMLParser
from pathlib import Path

# The pages, in the order a visitor would meet them: (file, public address, note).
PAGES = [
    ("index.html", "aerolex.dev/", "Homepage (forest journey, three project cards)"),
    ("about/index.html", "aerolex.dev/about/", "About and Get in touch"),
    ("resume/index.html", "aerolex.dev/resume/", "Résumé"),
    ("brazalete/index.html", "aerolex.dev/brazalete/", "Brazalete landing page"),
    ("brazalete/use/index.html", "aerolex.dev/brazalete/use/", "Brazalete working device"),
    ("brazalete/quiz/index.html", "aerolex.dev/brazalete/quiz/", "Brazalete ten-question quiz (page shell)"),
    ("stories/brazalete/index.html", "aerolex.dev/stories/brazalete/", "Design story: Brazalete"),
    ("stories/sanctum/index.html", "aerolex.dev/stories/sanctum/", "Design story: The Sanctum"),
    ("stories/hanyu-courtyard/index.html", "aerolex.dev/stories/hanyu-courtyard/", "Design story: Hanyu Courtyard"),
    ("sanctum/about/index.html", "aerolex.dev/sanctum/about/", "The Sanctum project page and guest tour"),
    ("hanyu-courtyard/index.html", "aerolex.dev/hanyu-courtyard/", "Hanyu Courtyard project page"),
    ("the-scene/index.html", "aerolex.dev/the-scene/", "The Scene landing page (check whether it is still public)"),
    ("private/the-scene/index.html", "aerolex.dev/private/the-scene/", "The Scene page behind the password"),
    ("privacy/index.html", "aerolex.dev/privacy/", "Privacy policy"),
]
# Teaching text that lives in a script, not a page: (file, public address, note).
JS_FILES = [("brazalete/engine/tutorials.js", "aerolex.dev/brazalete/use/ (Help and walkthroughs)", "Brazalete walkthrough lessons")]

STRONG = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "figcaption", "blockquote", "dt", "dd", "td", "th", "summary", "caption"}
WEAK = {"a", "button", "span", "div", "label", "strong", "em", "small", "time", "legend", "option"}
VOID = {"img", "br", "input", "meta", "link", "hr", "source", "wbr", "area", "base", "col", "embed", "track"}
SKIP = {"script", "style", "svg", "noscript", "template", "head", "title", "iframe", "canvas"}
REGION = {"header", "nav", "footer", "section", "aside", "dialog", "details", "figure", "form", "article", "main"}
RAW_OK = re.compile(r"</?(?:span|br|abbr|sup|sub|code|kbd|small|mark|time|wbr|b|i|u)\b[^>]*>", re.I)
META_KEYS = {"description", "og:title", "og:description", "og:image:alt", "twitter:title", "twitter:description"}
NBSP = " "


def h6(s):
    return hashlib.sha1(s.encode("utf8")).hexdigest()[:6]


# ---------- html <-> editable text ----------
def to_md(inner):
    """Turn a block's inner HTML into plain editable text (links as [text](url), bold **, italic *)."""
    s = re.sub(r"<a\b[^>]*?href=\"([^\"]*)\"[^>]*>(.*?)</a>", lambda m: f"[{m.group(2)}]({m.group(1)})", inner, flags=re.S)
    s = re.sub(r"<(strong|b)\b[^>]*>(.*?)</\1>", r"**\2**", s, flags=re.S)
    s = re.sub(r"<(em|i)\b[^>]*>(.*?)</\1>", r"*\2*", s, flags=re.S)
    s = re.sub(r"\s+", " ", s).strip()
    # Entities become the real characters, except the non-breaking space which stays visible.
    s = s.replace("&nbsp;", "\x00").replace(NBSP, "\x00")
    parts = re.split(r"(<[^>]+>)", s)
    s = "".join(p if p.startswith("<") else html.unescape(p) for p in parts)
    return s.replace("\x00", "&nbsp;")


def esc(t):
    t = t.replace("&nbsp;", "\x00")
    parts = re.split(f"({RAW_OK.pattern})", t, flags=re.I)
    out = []
    for p in parts:
        if RAW_OK.fullmatch(p or ""):
            out.append(p)
        else:
            out.append(p.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    return "".join(out).replace("\x00", "&nbsp;")


def from_md(md, original_inner):
    """Rebuild inner HTML from edited text, reusing each original link's tag (class, target...) in order."""
    anchors = re.findall(r"<a\b[^>]*>", original_inner)
    state = {"i": 0, "n": len(re.findall(r"\[[^\]]*\]\([^)]*\)", md))}

    def link(m):
        i = state["i"]; state["i"] += 1
        url = m.group(2).replace('"', "&quot;")
        if len(anchors) == state["n"] and i < len(anchors):
            tag = re.sub(r'href="[^"]*"', f'href="{url}"', anchors[i], count=1)
        else:
            tag = f'<a href="{url}">'
        return tag + "\x01" + m.group(1) + "\x02"

    t = re.sub(r"\[([^\]]*)\]\(([^)]*)\)", link, md)
    t = re.sub(r"\*\*(.+?)\*\*", "\x03\\1\x04", t)
    t = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", "\x05\\1\x06", t)
    # Protect the raw tags that link() just wrote, then escape the rest.
    t = re.sub(r"(<a\b[^>]*>)", lambda m: m.group(1).replace("<", "\x07").replace(">", "\x08"), t)
    t = esc(t)
    t = (t.replace("\x07", "<").replace("\x08", ">").replace("\x01", "").replace("\x02", "</a>")
         .replace("\x03", "<strong>").replace("\x04", "</strong>").replace("\x05", "<em>").replace("\x06", "</em>"))
    return t


def has_letters(s):
    return re.search(r"[^\W\d_]", re.sub(r"<[^>]+>", "", s)) is not None


# ---------- parsing pages ----------
class Page(HTMLParser):
    def __init__(self, src):
        super().__init__(convert_charrefs=True)
        self.src = src
        self.starts = [0]
        for m in re.finditer("\n", src):
            self.starts.append(m.end())
        self.els = []; self.stack = []; self.images = []

    def pos(self):
        line, col = self.getpos()
        return self.starts[line - 1] + col

    def handle_starttag(self, tag, attrs):
        p = self.pos(); raw = self.get_starttag_text(); d = dict(attrs)
        if tag == "img" and d.get("alt"):
            m = re.search(r'alt="([^"]*)"', raw)
            if m:
                self.images.append((p + m.start(1), p + m.end(1), m.group(1), list(self.stack)))
        if tag in VOID:
            return
        e = dict(tag=tag, attrs=d, parent=self.stack[-1] if self.stack else None, open=p, inner=p + len(raw), end=None, i=len(self.els))
        self.els.append(e); self.stack.append(e["i"])

    def handle_startendtag(self, tag, attrs):
        if tag == "img":
            self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        p = self.pos()
        for k in range(len(self.stack) - 1, -1, -1):
            if self.els[self.stack[k]]["tag"] == tag:
                for j in self.stack[k:]:
                    if self.els[j]["end"] is None:
                        self.els[j]["end"] = p
                del self.stack[k:]
                break


def chain(P, i):
    out = []
    while i is not None:
        out.append(P.els[i]); i = P.els[i]["parent"]
    return out


def units_for_html(path, src):
    P = Page(src); P.feed(src); P.close()
    els = P.els
    for e in els:
        if e["end"] is None:
            e["end"] = e["inner"]
    skipped = set(); hidden = {}
    for e in els:
        anc = chain(P, e["i"])
        if any(a["tag"] in SKIP for a in anc) or e["attrs"].get("aria-hidden") == "true":
            skipped.add(e["i"])
    cand = []
    for e in els:
        if e["i"] in skipped or e["end"] <= e["inner"]:
            continue
        inner = src[e["inner"]:e["end"]]
        if not has_letters(inner):
            continue
        if e["tag"] in STRONG:
            cand.append(e["i"])
    cs = set(cand)
    for e in els:
        if e["i"] in skipped or e["tag"] not in WEAK or e["end"] <= e["inner"]:
            continue
        if not has_letters(src[e["inner"]:e["end"]]):
            continue
        if any(a["i"] in cs for a in chain(P, e["parent"])):
            continue
        cs.add(e["i"])
    # keep the innermost candidates (a candidate that contains another candidate is a container, not a block)
    parentset = {els[i]["parent"] for i in cs}
    leaves = []
    containers = 0
    for i in sorted(cs):
        a = els[i]
        inside = any(j != i and a["inner"] <= els[j]["open"] and els[j]["end"] <= a["end"] for j in cs)
        if inside:
            containers += 1
            continue
        leaves.append(a)
    units = []
    heading = ""
    items = [("e", a["open"], a) for a in leaves] + [("img", t[0], t) for t in P.images]
    items.sort(key=lambda x: x[1])
    # Walk headings in document order to label each block with the heading above it.
    heads = [(e["open"], to_md(src[e["inner"]:e["end"]])) for e in els if e["tag"] in {"h1", "h2", "h3"} and e["i"] not in skipped and e["end"] > e["inner"]]
    for kind, pos, obj in items:
        above = ""
        for hp, ht in heads:
            if hp <= pos:
                above = ht
        if kind == "e":
            a = obj; anc = chain(P, a["i"])
            reg = ""
            for x in anc[1:]:
                if x["tag"] in REGION:
                    nm = x["attrs"].get("aria-label") or x["attrs"].get("id") or (x["attrs"].get("class", "").split() or [""])[0]
                    nice = nm.replace("-", " ").replace("_", " ")
                    reg = {"header": "top bar", "nav": "menu", "footer": "footer", "main": "", "aside": "side panel", "dialog": "pop-up panel"}.get(x["tag"], (f"“{nice}” section" if nice else x["tag"]))
                    if x["tag"] == "nav" and nice:
                        reg = "menu"
                    break
            hid = any("hidden" in x["attrs"] for x in anc)
            tag = a["tag"]
            label = {"h1": "main heading", "h2": "heading", "h3": "subheading", "h4": "subheading", "p": "paragraph", "li": "list item", "a": "link", "button": "button", "figcaption": "picture caption", "td": "table cell", "th": "table heading", "summary": "expandable heading"}.get(tag, "text")
            if tag == "a" and "button" in a["attrs"].get("class", ""):
                label = "button link"
            inner = src[a["inner"]:a["end"]]
            units.append(dict(mode="html", start=a["inner"], end=a["end"], md=to_md(inner), inner=inner, label=label, where=reg, above=above, hidden=hid))
        else:
            s, e2, alt, stk = obj
            units.append(dict(mode="attr", start=s, end=e2, md=html.unescape(alt), inner=alt, label="picture description (alt text)", where="", above=above, hidden=False))
    # Head: title and share-preview text.
    hs = src.find("<head"); he = src.find("</head>")
    if hs >= 0 and he > hs:
        head = src[hs:he]
        m = re.search(r"<title>(.*?)</title>", head, re.S)
        extra = []
        if m:
            extra.append(("browser tab title", hs + m.start(1), hs + m.end(1), "html", m.group(1)))
        for mm in re.finditer(r"<meta\b[^>]*>", head):
            tagtxt = mm.group(0)
            key = re.search(r'(?:name|property)="([^"]+)"', tagtxt)
            val = re.search(r'content="([^"]*)"', tagtxt)
            if key and val and key.group(1) in META_KEYS:
                base = hs + mm.start() + val.start(1)
                extra.append((f"search/share preview ({key.group(1)})", base, base + len(val.group(1)), "attr", val.group(1)))
        for lab, s, e2, mode, raw in extra:
            units.insert(0, dict(mode=mode, start=s, end=e2, md=html.unescape(raw), inner=raw, label=lab, where="head", above="", hidden=False, head=True))
        # keep head items together in file order, ahead of the body
        heads_u = sorted([u for u in units if u.get("head")], key=lambda u: u["start"])
        body_u = [u for u in units if not u.get("head")]
        units = heads_u + body_u
    return units, containers


def units_for_js(path, src):
    units = []
    pat = re.compile(r"(step\('((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)')|(finish\('((?:[^'\\]|\\.)*)')|(title: '((?:[^'\\]|\\.)*)')")
    for m in pat.finditer(src):
        if m.group(1):
            t0 = m.start(2); copy0 = m.start(3)
            for lab, g in (("walkthrough step title", 2), ("walkthrough step text", 3)):
                units.append(dict(mode="js", start=m.start(g), end=m.end(g), md=unq(m.group(g)), inner=m.group(g), label=lab, where="", above="", hidden=False))
        elif m.group(4):
            units.append(dict(mode="js", start=m.start(5), end=m.end(5), md=unq(m.group(5)), inner=m.group(5), label="walkthrough closing text", where="", above="", hidden=False))
        else:
            units.append(dict(mode="js", start=m.start(7), end=m.end(7), md=unq(m.group(7)), inner=m.group(7), label="walkthrough name", where="", above="", hidden=False))
    return units, 0


def unq(s):
    return s.replace("\\'", "'").replace("\\\\", "\\")


def req(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")


# ---------- extract ----------
def make_id(prefix, n):
    return f"{prefix}-{n:03d}"


def prefix_of(path):
    p = path.replace("/index.html", "").replace("index.html", "home").replace("/", "-").replace(".js", "")
    return p or "home"


def extract(site, doc):
    site = Path(site)
    out = []
    out.append("""---
title: Website Text Review
tags:
  - product/aerolex-website
  - type/handoff
---

# Website text review

Every visible word on the website, page by page, in one place. **Edit the text under each marker.** Then tell Claude
"apply my text edits": the changes are written into the website's release copy, you review the result, and
nothing goes live until you say go.

**How to edit**
- Change only the plain text under a line that starts with a bold id like **[about-007]**. Leave that line alone
  (the hidden code at its end is how your edit finds its place).
- `[words](address)` is a link: change the words freely; change the address only if you mean to.
  `**words**` is bold and `*words*` is italic.
- Each block says where it lives on the page (section, the heading above it, and what kind of text it is).
- To remove a block's text, don't blank it; write "DELETE" and tell Claude, so it can check the layout.
- Text that visitors don't see (page titles in the browser tab, the lines shown when a link is shared) is
  at the top of each page under "Search and share previews".
- Words inside the Sanctum app itself (buttons, tooltips, tour steps) are not here: they live in the Sanctum's
  own code. The Brazalete quiz's questions are generated from verb data, so only its page shell is here.

""")
    total = 0
    for path, url, note in PAGES:
        f = site / path
        if not f.exists():
            continue
        src = f.read_text(encoding="utf8")
        us, cont = units_for_html(path, src)
        out.append(f"\n## {note}\n\n*Public address: {url} · file: `{path}`*\n")
        pre = prefix_of(path); n = 0; head_done = False; body_done = False
        for u in us:
            n += 1; total += 1
            if u.get("head") and not head_done:
                out.append("\n### Search and share previews (not shown on the page itself)\n"); head_done = True
            if not u.get("head") and not body_done:
                out.append("\n### On the page\n"); body_done = True
            where = u["where"] if u["where"] and u["where"] != "head" else ""
            loc = u["label"] + (f" · {where}" if where else "") + (f" · under “{u['above'][:60]}”" if u["above"] and u["md"] != u["above"] else "")
            if u["hidden"]:
                loc += " · hidden until used"
            out.append(f"**[{make_id(pre, n)}]** *{loc}* <!--h:{h6(u['md'])}-->\n{u['md']}\n")
    for path, url, note in JS_FILES:
        f = site / path
        if not f.exists():
            continue
        src = f.read_text(encoding="utf8")
        us, _ = units_for_js(path, src)
        out.append(f"\n## {note}\n\n*Shown at: {url} · file: `{path}`*\n\n### Walkthrough text (still unreviewed since 11 November)\n")
        pre = prefix_of(path); n = 0
        for u in us:
            n += 1; total += 1
            out.append(f"**[{make_id(pre, n)}]** *{u['label']}* <!--h:{h6(u['md'])}-->\n{u['md']}\n")
    Path(doc).write_text("\n".join(out), encoding="utf8")
    print(f"wrote {doc}: {total} text blocks")


# ---------- apply ----------
BLOCK = re.compile(r"^\*\*\[([a-z0-9-]+)\]\*\*[^\n]*?<!--h:([0-9a-f]{6})-->\n(.*?)(?=^\*\*\[[a-z0-9-]+\]\*\*|^#{1,3} |\Z)", re.S | re.M)


def apply(site, doc):
    site = Path(site)
    text = Path(doc).read_text(encoding="utf8")
    edits = {m.group(1): (m.group(2), m.group(3).strip()) for m in BLOCK.finditer(text)}
    changed = skipped = untouched = 0
    problems = []
    files = [(p, "html") for p, _, _ in PAGES] + [(p, "js") for p, _, _ in JS_FILES]
    for path, kind in files:
        f = site / path
        if not f.exists():
            continue
        src = f.read_text(encoding="utf8")
        us = (units_for_js if kind == "js" else units_for_html)(path, src)[0]
        pre = prefix_of(path); repl = []
        for n, u in enumerate(us, 1):
            bid = make_id(pre, n)
            if bid not in edits:
                continue
            fp, body = edits[bid]
            if body == u["md"]:
                untouched += 1; continue
            if h6(u["md"]) != fp:
                problems.append(f"{bid}: the page changed since the document was made, so this block was skipped. Re-run extract.")
                skipped += 1; continue
            if body.strip().upper() == "DELETE" or not body.strip():
                problems.append(f"{bid}: left blank or DELETE; skipped (ask Claude to remove it so the layout can be checked).")
                skipped += 1; continue
            if u["mode"] == "html":
                new = from_md(body, u["inner"])
            elif u["mode"] == "attr":
                new = body.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")
            else:
                new = req(body)
            repl.append((u["start"], u["end"], new, bid)); changed += 1
        if repl:
            for s, e, new, bid in sorted(repl, reverse=True):
                src = src[:s] + new + src[e:]
            f.write_text(src, encoding="utf8")
            print(f"  {path}: {len(repl)} block(s) updated")
    print(f"done: {changed} changed, {untouched} unchanged, {skipped} skipped")
    for p in problems:
        print("  !", p)
    unknown = [i for i in edits if not any(i.startswith(prefix_of(p) + "-") for p, _ in files)]
    if unknown:
        print("  ! ids not recognised:", ", ".join(unknown))


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] not in ("extract", "apply"):
        print(__doc__); sys.exit(1)
    (extract if sys.argv[1] == "extract" else apply)(sys.argv[2], sys.argv[3])
