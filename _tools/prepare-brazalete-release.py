"""Assemble only the approved Brazalete pages; never publish or alter another product.""" # Explain this local preparation helper.
from pathlib import Path # Resolve all destinations inside the selected release checkout.
import shutil # Copy the existing allowlisted working engine without rewriting its data.
from PIL import Image # Make compressed web copies while keeping originals in the Scene repo.
from bs4 import BeautifulSoup # Preserve the complete existing story instead of copying excerpts by hand.
root = Path(__file__).resolve().parents[1] # Keep writes within this release worktree.
code = root.parents[1] # Locate the shared AeroLex-Code workspace.
source = code / '_worktrees/aerolex-website-devlog-launch' # Read the newer local pages without altering that dirty checkout.
mock = Path(r'C:/Users/ncsep/.codex/visualizations/2026/11/14/01a1d9aa-29a7-7592-bcec-b5d830a16be7/brazalete-preview') # Reuse the reviewed website styling.
app = root / 'brazalete' # Keep the release self-contained at the existing product address.
ui = app / 'ui' # Store only compressed web art and shared interface styles here.
engine = app / 'engine' # Keep the allowlisted conjugation engine separate from website layout.
for folder in [ui, engine, app/'use', app/'quiz', root/'stories/brazalete', root/'assets/stories/brazalete']: folder.mkdir(parents=True, exist_ok=True) # Prepare named destinations without deleting anything.
for name in ['data.js','audio.js','public-region.js','gadget.js','receiver.js','gadget-lab.css']: shutil.copy2(source/'brazalete/assets'/name,engine/name) # Use the previously verified public-only engine bundle.
for name in ['explorer.js','explorer.css','tutorials.js']: shutil.copy2(source/'brazalete'/name,engine/name) # Retain real exploration and guided interaction behavior.
for name in ['preview.css','art.css','reference.css','button-alignment.css']: shutil.copy2(mock/name,ui/name) # Bring over the reviewed appearance and measured button alignment.
for name in ['preview.css','art.css']: (ui/name).write_text((ui/name).read_text(encoding='utf-8').replace('.device{','.hero-art .device{'),encoding='utf-8') # Scope decorative watch styling so it cannot tilt or reshape the working engine.
for original,output in [('water-desktop.png','water-desktop.webp'),('water-phone.png','water-phone.webp'),('landing-device.png','landing-device.webp'),('button-art.png','button-art.webp')]: Image.open(mock/original).save(ui/output,'WEBP',quality=88,method=6) # Compress delivery copies without replacing the original AI artwork.
for name in ['preview.css','art.css','reference.css','button-alignment.css']: (ui/name).write_text((ui/name).read_text(encoding='utf-8').replace('water-desktop.png','water-desktop.webp').replace('water-phone.png','water-phone.webp').replace('button-art.png','button-art.webp'),encoding='utf-8') # Point shared styles at their compressed local images.
styles=''.join(f'<link rel="stylesheet" href="/brazalete/ui/{name}">' for name in ['preview.css','art.css','reference.css','button-alignment.css','release.css']) # Load shared styling in the same order on every page.
landing=BeautifulSoup((mock/'index.html').read_text(encoding='utf-8-sig'),'html.parser') # Start from the approved introduction structure.
for link in landing.select('link[rel=stylesheet]'): link.decompose() # Replace relative preview references with stable site-root paths.
landing.head.append(BeautifulSoup(styles,'html.parser')) # Share production-ready theme paths.
landing.select_one('.notice').decompose() # Remove prototype labels from the visitor-facing release page.
landing.select_one('.hero-device')['src']='/brazalete/ui/landing-device.webp' # Use the decorative compressed artwork only on the introduction.
for button in landing.select('[data-view=tool]'): button.name='a';button['href']='/brazalete/use/';del button['data-view'] # Give the working tool its own direct and shareable address.
for button in landing.select('[data-modal=library]'): button['data-action']='library';del button['data-modal'] # Use the real local video-library panel.
for button in landing.select('[data-modal=help]'): button['data-action']='help';del button['data-modal'] # Consolidate help without prototype event handlers.
landing.select_one('#tool').decompose() # Keep the working page out of the landing document.
landing.select_one('#overlay').decompose() # Replace prototype modals with accessible native dialogs.
landing.select_one('script[src="preview.js"]')['src']='/brazalete/ui/site.js' # Connect shared navigation and dialogs.
landing.body['data-page']='landing' # Let the shared controller expose only relevant page actions.
landing.head.append(BeautifulSoup('<meta name="description" content="Explore Spanish verb forms with the Brazalete, then practise with a phone-friendly quiz."><link rel="canonical" href="https://aerolex.dev/brazalete/">','html.parser')) # Supply accurate search metadata.
(app/'index.html').write_text(str(landing),encoding='utf-8') # Write only this product's introduction.
use=BeautifulSoup((source/'brazalete/index.html').read_text(encoding='utf-8'),'html.parser') # Preserve required IDs and event hooks in the actual working explorer.
for el in use.select('link[rel=stylesheet],script'): el.decompose() # Reconnect only the assets needed for the working page.
for el in use.select('.top,.intro,.quickstart,.examples,.pronouns,.quiz-invite,.devlog,.story-card,footer,.tutorial-menu,.help'): el.extract() if el.get('id')=='tutorials' or 'help' in el.get('class',[]) else None # Keep tutorial and help references ready for the unified dialog.
original=BeautifulSoup((source/'brazalete/index.html').read_text(encoding='utf-8'),'html.parser') # Read the untouched source again to move complete Help content.
tutorials=original.select_one('#tutorials');reference=original.select_one('details.help') # Preserve all existing tutorial text and keyboard guidance.
for el in use.select('.top,.intro,.quickstart,.examples,.pronouns,.quiz-invite,.devlog,.story-card,footer,.tutorial-menu,.help'): el.decompose() # Remove unrelated landing sections from the active workspace.
hidden=original.select_one('.pronouns');hidden['hidden']='';use.body.append(hidden) # Keep the old receiver's required engine hooks out of the current visual workspace.
toolbar='<header class="tool-head aero-bar"><a class="secondary" href="/brazalete/">Home</a><a class="brand" href="/brazalete/"><span class="drop" aria-hidden="true"></span>Brazalete</a><div class="workspace-actions"><button id="sound" class="secondary" aria-pressed="false">Sound off</button><button class="secondary" data-action="help">Help</button><a class="primary" href="/brazalete/quiz/">Practice</a></div></header>' # Keep sound, Help and Practice close to the device.
use.body.insert(0,BeautifulSoup(toolbar,'html.parser')) # Place the toolbar before the actual workspace.
dialog=BeautifulSoup('<dialog id="help-dialog"><button class="close" data-close-dialog aria-label="Close Help">✕</button><h2>Help with the Brazalete</h2><div class="help-options"></div></dialog>','html.parser') # Use a real modal with native keyboard handling.
dialog.select_one('.help-options').append(tutorials);dialog.select_one('.help-options').append(reference);use.body.append(dialog) # Keep all previous explanatory content reachable from Help.
use.body['data-page']='use';use.body['class']='working-page' # Apply working-page layout without touching the device's own geometry.
use.head.append(BeautifulSoup('<link rel="stylesheet" href="/brazalete/engine/gadget-lab.css"><link rel="stylesheet" href="/brazalete/engine/explorer.css">'+styles,'html.parser')) # Load device styles before the scoped website theme.
scripts=['data.js','audio.js','public-region.js','gadget.js','receiver.js','tutorials.js','explorer.js'] # Maintain the dependency order expected by the existing engine.
for name in scripts: use.head.append(BeautifulSoup(f'<script defer src="/brazalete/engine/{name}"></script>','html.parser')) # Reuse existing conjugation and walkthrough code rather than reimplementing them.
use.head.append(BeautifulSoup('<script defer src="/brazalete/ui/site.js"></script>','html.parser')) # Add only release navigation, focus and dialog behavior.
use.select_one('title').string='Use the Brazalete · Spanish verbs' # Give the working page a clear browser title.
for meta in use.select('link[rel=canonical]'): meta['href']='https://aerolex.dev/brazalete/use/' # Keep this direct working address distinct from the introduction.
(app/'use/index.html').write_text(str(use),encoding='utf-8') # Save the working page with the original device and tutorial hooks intact.
explorer=(engine/'explorer.js').read_text(encoding='utf-8').replace("'aerolex.brazalete.explorer.v1'","'aerolex.brazalete.explorer.v2'").replace("[0, 2] : [0, 1]","[0, 2, 1] : [0, 1]") # Keep new preferences separate and restore the complete chosen verb state.
explorer=explorer.replace('})(); // Finish the local explorer',"if (!saved.word) { Gadget.clear(); $('loaded-word').textContent = 'Choose a verb'; $('picker').open = true; $('form-help').textContent = 'Choose a word to bring the device to life.'; save(); } // Start a first visit with an accessible empty device, without saving the temporary default word.\n})(); // Finish the local explorer") # Respect the agreed first-visit empty state.
(engine/'explorer.js').write_text(explorer,encoding='utf-8') # Keep this release's explorer changes explicit and separate from generated data.
for image in (source/'assets/stories/brazalete').glob('*'): shutil.copy2(image,root/'assets/stories/brazalete'/image.name) # Preserve the actual historical evidence and captions.
story=BeautifulSoup((source/'stories/brazalete/index.html').read_text(encoding='utf-8'),'html.parser') # Restyle the complete article, not the mockup's shortened sample text.
for el in story.select('link[rel=stylesheet],link[rel=preconnect],script,.site-header,.site-footer,.crumbs'): el.decompose() # Remove the old theme and unrelated navigation only.
story.head.append(BeautifulSoup(styles+'<script defer src="/brazalete/ui/site.js"></script>','html.parser')) # Use exactly the introduction's visual family.
story.body['class']='story-page';story.body['data-page']='story' # Keep reading-page styles separate from device layout.
header='<header class="aero-bar"><a class="brand" href="/brazalete/"><span class="drop" aria-hidden="true"></span>Brazalete</a><nav aria-label="Story navigation"><a href="/brazalete/">Home</a><a href="#main" aria-current="page">Design story</a></nav><a class="secondary" href="/brazalete/use/">Use the Brazalete</a></header>' # Match the approved story mockup with an explicit return route.
story.body.insert(0,BeautifulSoup(header,'html.parser')) # Keep the actual title and paragraphs directly beneath the themed header.
for a in story.select('.story-toc a'): a['class']='secondary' # Make chapter navigation clearly shaped and centered.
for fig in story.select('figure'): fig['class']=fig.get('class',[])+['history-figure'] # Frame historical pictures without regenerating or recoloring them.
for caption in story.select('figcaption strong'): caption.string='Later working version.' if caption.get_text(strip=True)=='Today.' else caption.get_text() # Avoid presenting an earlier screenshot as the new current interface.
status=story.select_one('#next');status.select_one('h2').string='A development checkpoint' # Clearly mark the retained earlier status rather than claim the new quiz is already live.
status.insert(2,BeautifulSoup('<p class="status-note">This section records the earlier version described in this story. Use the Brazalete to explore the current tool and practice.</p>','html.parser')) # Preserve the original content with its development context visible.
for a in story.select('a[href="/brazalete/"]'): a['href']='/brazalete/use/' if a.get('class')==['next-card'] else '/brazalete/' # Keep the introduction link distinct from trying the actual tool.
for a in story.select('a[href="/brazalete/#dev-log"]'): a['href']='/brazalete/#devlog' # Fix the dev-log anchor for the reviewed introduction.
for a in story.select('a[href="/stories/sanctum/"]'): a['href']='/sanctum/about/';a.select_one('strong').string='Explore The Sanctum' # Link to an existing project destination without staging unrelated pages.
for a in story.select('a[href="/stories/hanyu-courtyard/"]'): a['href']='/chinese/';a.select_one('strong').string='Explore Hanyu Courtyard' # Keep the related-project link functional on this release base.
story.body.append(BeautifulSoup('<footer>Designed by Noah Zepter-Martínez <a href="/">AeroLex</a></footer>','html.parser')) # Retain attribution without unrelated portfolio controls.
(root/'stories/brazalete/index.html').write_text(str(story),encoding='utf-8') # Write the complete themed story for local review.
print('Prepared Brazalete landing, working explorer, story and compressed assets. Nothing published.') # Make the release boundary explicit.
