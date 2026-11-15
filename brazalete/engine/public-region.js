const VOS_FORMS = { // Explicit Argentine/Uruguayan forms for the current supported library; no guessed conjugations.
  necesitar: { present: 'necesitás', command: 'necesitá' }, // RAE DLE necesitar; other moods use the maintained Tú rows.
  ser: { present: 'sos', command: 'sé' }, // RAE DLE ser preserves both irregular forms.
  estar: { present: 'estás', command: 'está' }, // RAE DLE estar preserves the written accents.
  comer: { present: 'comés', command: 'comé' }, // RAE DLE comer provides singular Vos, not vosotros.
  vivir: { present: 'vivís', command: 'viví' }, // RAE DLE vivir provides the stressed endings.
  tener: { present: 'tenés', command: 'tené' }, // RAE DLE tener differs from tienes and ten.
  pagar: { present: 'pagás', command: 'pagá' }, // RAE DLE pagar supplies this supported base verb.
  comprar: { present: 'comprás', command: 'comprá' }, // RAE DLE comprar supplies this supported base verb.
  trabajar: { present: 'trabajás', command: 'trabajá' }, // RAE DLE trabajar supplies this supported base verb.
  querer: { present: 'querés', command: 'queré' }, // RAE DLE querer keeps the unstressed stem in Vos.
  llamarse: { present: 'llamás', command: 'llamate' }, // Attach te to llamá and follow normal accent rules; the shared device supplies te for finite phrases.
  levantarse: { present: 'levantás', command: 'levantate' }, // Attach te to levantá without introducing an unnecessary accent.
  ver: { present: 'ves', command: 've' }, // RAE DLE ver uses these short forms for Vos too.
}; // Negative commands intentionally use the agreed present-subjunctive pattern; regional alternatives belong in help.
