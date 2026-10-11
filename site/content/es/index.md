---
seo:
  title: agent-kit — un arnés mínimo para Claude Code
  description: Responde unas preguntas y obtén un proyecto que tu agente entiende. Reglas aplicadas por hooks, un contexto de sesión pequeño, trabajo que se retoma, specs vivas trazadas a los tests y QA que sigue a las specs.
sourceHash: e29d62103650
---

::u-page-hero
---
orientation: horizontal
ui:
  title: text-4xl sm:text-5xl lg:text-[3.4rem] lg:leading-[1.1]
---
#headline
:repo-stats

#title
Responde unas preguntas. Obtén un proyecto que tu agente [entiende]{.text-primary}.

#description
agent-kit prepara un proyecto para el desarrollo guiado por agentes con Claude Code: reglas aplicadas por hooks en lugar de prosa, un contexto pequeño en cada sesión, trabajo que se retoma donde quedó, specs vivas trazadas a los tests y un checklist de QA que sigue a las specs.

#links
  :::u-button
  ---
  size: xl
  to: /es/getting-started/installation
  trailing-icon: i-lucide-arrow-right
  ---
  Empezar
  :::

  :::u-button
  ---
  color: neutral
  icon: i-simple-icons-github
  size: xl
  to: https://github.com/razcue/agent-kit
  variant: outline
  ---
  Ver en GitHub
  :::

#default
  :::terminal-demo
  ---
  title: ~/shop
  replay: Repetir
  lines:
    - { t: cmd, text: "npx @razcue/agent-kit init shop" }
    - { t: q, text: "Setup", a: "New app monorepo" }
    - { t: q, text: "Technical level", a: "Technical" }
    - { t: q, text: "Development method", a: "SDD + TDD" }
    - { t: q, text: "Git flow for the agent", a: "Branches + pull requests" }
    - { t: q, text: "QA checklist · Supabase test data", a: "Yes · Yes" }
    - { t: gap }
    - { t: ok, text: "apps/web · apps/app · apps/docs · packages/ui · packages/shared" }
    - { t: ok, text: "AGENTS.md · agent-kit.json · .claude/settings.json" }
    - { t: ok, text: ".knowledge/ · work/specs/ · work/qa/ · supabase/test-data/" }
    - { t: ok, text: "plugin agent-kit@agent-kit enabled" }
    - { t: gap }
    - { t: out, text: "Next: cd shop && npm install && claude" }
  ---
  :::
::

::u-page-section
#title
Menos contexto, más trabajo

#description
Lo que el agente lee antes de tu primera pregunta, medido con `agent-kit context`.

#default
  :::context-meter
  ---
  without: 22974
  with: 3631
  without-label: Un proyecto real en producción, reglas en AGENTS.md + memoria
  with-label: Un monorepo nuevo con agent-kit, todo incluido
  unit: tokens
  saved-label: menos contexto en cada sesión
  source: Ambos medidos con agent-kit context, incluido el mismo ~/CLAUDE.md personal. El contexto de sesión propio de agent-kit ronda los 1300 tokens; doctor falla un proyecto por encima de 8000.
  ---
  :::

  :::compare-rows
  ---
  without-title: Por tu cuenta
  with-title: Con agent-kit
  rows:
    - topic: Reglas
      without: Una línea en AGENTS.md que el agente puede olvidar o ignorar.
      with: Hooks y comprobaciones — el git guard bloquea lo que tu flujo de git prohíbe, probado en vivo en cada versión.
    - topic: Sesión nueva
      without: Vuelves a explicar dónde estabas y qué seguía.
      with: Empieza con el último checkpoint y la próxima tarea de cada trabajo.
    - topic: Requisitos
      without: Repartidos entre chats y tickets; nadie sabe cuál es la verdad actual.
      with: Specs vivas — requisitos EARS con escenarios Given / When / Then, ids que nunca se reutilizan.
    - topic: Prueba
      without: “Parece que está listo.”
      with: Cada escenario trazado a un test o una comprobación; preflight bloquea un cambio que no lo esté.
    - topic: Scripts
      without: Reescritos en /tmp cada vez, perdidos al día siguiente.
      with: Se buscan primero, se conservan con cabecera y test, y se ejecutan con un resultado compacto.
    - topic: QA
      without: Probar de memoria, haciendo clics.
      with: Un checklist generado desde las specs vivas, pasadas con fecha y datos de prueba con seed / purge.
    - topic: Instalación
      without: AGENTS.md, ajustes, hooks y convenciones escritos a mano.
      with: Un comando, unas diez preguntas, nada inferido.
  ---
  :::
::

::u-page-section
---
orientation: horizontal
---
#title
Reglas que se aplican, no que se piden

#description
"Nunca hagas commit en main" en un Markdown es una sugerencia. El git guard de agent-kit lee tu flujo de git y bloquea el comando antes de que se ejecute —incluso a través de `bash -c`, `eval` y alias— y le dice al agente qué hacer en su lugar.

#links
  :::u-button
  ---
  color: neutral
  variant: outline
  to: /es/concepts/guardrails
  trailing-icon: i-lucide-arrow-right
  ---
  Garantías
  :::

#default
  :::terminal-demo
  ---
  title: agent · shop (main)
  replay: Repetir
  lines:
    - { t: cmd, text: 'git commit -m "feat: add invoices"' }
    - { t: err, text: "[agent-kit git-guard] Git flow is branches + pull requests:" }
    - { t: out, text: "  don't `git commit` on main. Create a feature branch first" }
    - { t: out, text: "  (`git switch -c feat/<name>`)." }
    - { t: gap }
    - { t: cmd, text: "git switch -c feat/invoices" }
    - { t: ok, text: "Switched to a new branch 'feat/invoices'" }
  ---
  :::
::

::u-page-section
#title
Specs vivas que se fusionan, no que se pudren

#description
Un cambio trae un delta. Cuando está verificado, un comando lo fusiona en la spec viva: el requisito nuevo llega, el eliminado queda retirado para siempre y su escenario ya está probado por un test y listado para QA.

#default
  :::spec-merge
  ---
  delta-label: Cambio 004 — spec delta
  spec-label: Spec viva
  retired-label: retirado
  test-label: Test
  qa-label: Checklist de QA
  ---
  :::
::

::u-page-section
#title
Cómo funciona

#features
  :::u-page-feature
  ---
  icon: i-lucide-list-checks
  to: /es/getting-started/installation
  ---
  #title
  Respondes preguntas fijas

  #description
  Tipo de proyecto, nivel técnico, idioma, método (SDD o SDD + TDD), commits, flujo de git, QA. Nada se infiere.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-layers
  to: /es/getting-started/project-layout
  ---
  #title
  Recibes la capa del agente

  #description
  Un bloque corto en AGENTS.md, agent-kit.json, permisos aplicados, conocimiento, archivos de trabajo, scripts y el plugin con sus skills y hooks.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-route
  to: /es/concepts/lanes-and-methods
  ---
  #title
  Trabajas por carriles

  #description
  Responder, vía rápida o spec. El trabajo complejo se vuelve un cambio con requisitos EARS y escenarios Given/When/Then que se fusionan en las specs vivas.
  :::
::

::u-page-section
#title
Lo que obtienes

#features
  :::u-page-feature
  ---
  icon: i-lucide-book-open-check
  to: /es/concepts/living-specs
  ---
  #title
  Specs vivas, una notación

  #description
  Requisitos EARS, escenarios Given/When/Then como tests de aceptación y ZOMBIES para elegir los casos; los fusiona un script y los ids nunca se reutilizan.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-clipboard-check
  to: /es/concepts/qa-and-test-data
  ---
  #title
  QA que sigue a las specs

  #description
  Un checklist generado desde las specs vivas, pasadas de QA con fecha y datos de prueba de Supabase que se niegan a correr en producción.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-sparkles
  to: /es/reference/skills
  ---
  #title
  Skills que cargan solo cuando hacen falta

  #description
  Once skills del plugin y una skill de stack por plantilla; sus descripciones se prueban para que se activen con pedidos reales y callen en lo demás.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-shield
  to: /es/concepts/guardrails
  ---
  #title
  Garantías que se aplican

  #description
  Git guard, preflight antes de fusionar, revisión de commits y un aviso de scripts perdidos; en silencio fuera de los proyectos agent-kit.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-brain
  to: /es/concepts/knowledge
  ---
  #title
  Conocimiento barato de cargar

  #description
  Un concepto por archivo y solo carga el resumen de una línea; ámbitos de proyecto, de máquina y globales.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-bot
  to: /es/guides/docs-for-agents
  ---
  #title
  Documentación también para agentes

  #description
  llms.txt, llms-full.txt y un servidor MCP para que tu agente lea esta documentación mientras trabaja.
  :::
::

::u-page-c-t-a
---
title: Empieza con un comando
description: Node ≥ 20.11 y Claude Code. No se añade ninguna dependencia en tiempo de ejecución a tu proyecto.
variant: subtle
links:
  - label: Leer la guía de instalación
    to: /es/getting-started/installation
    trailingIcon: i-lucide-arrow-right
  - label: Adoptar un proyecto existente
    to: /es/guides/adopt-existing-project
    color: neutral
    variant: outline
---
```bash [Terminal]
npx @razcue/agent-kit init my-project
```
::
