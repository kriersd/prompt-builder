import { promptsApi, templatesApi, rolesApi, personasApi, aiApi } from './api.js'

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  view:            'editor',
  promptType:      'system',
  role:            '',
  roleTraits:      [],
  taskDescription: '',
  tone:            'Professional & Precise',
  outputFormat:    'Structured Markdown',
  constraints:     '',
  targetModel:     'claude-sonnet-4-6',
  generatedPrompt: '',
  qualityScore:    null,
  qualityMetrics:  null,
  currentPromptId: null,
  isGenerating:    false,
  generateAbort:   null,
  personas:        [],
  activePersonaId: null,
  activePersona:   null,
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)
const $$ = sel => document.querySelectorAll(sel)

// ── Lucide icons ──────────────────────────────────────────────────────────────
function refreshIcons() { window.lucide?.createIcons() }

// ── View switching ────────────────────────────────────────────────────────────
function switchView(name) {
  state.view = name
  $$('.view').forEach(v => v.classList.remove('active'))
  $$('.nav-item').forEach(n => n.classList.remove('active'))

  const view = $(`view-${name}`)
  if (view) view.classList.add('active')

  const navBtn = document.querySelector(`.nav-item[data-view="${name}"]`)
  if (navBtn) navBtn.classList.add('active')

  // Update top-bar
  const titles = {
    editor:    ['New Prompt',  'Build enterprise-grade AI prompts with precision'],
    prompts:   ['My Prompts', 'Your saved prompt collection'],
    templates: ['Templates',  'Start fast with a built-in template'],
    roles:     ['Roles', 'Select a role to set your context — prompts are tailored to your background'],
    personas:  ['My Personas', 'Define your context to personalize AI-generated prompts'],
    library:   ['Library',    'Browse community prompts'],
    settings:  ['Settings',   ''],
  }
  const [title, sub] = titles[name] ?? ['PromptForge', '']
  $('page-title').textContent   = title
  $('page-subtitle').textContent = sub
  $('editor-actions').style.display = name === 'editor' ? 'flex' : 'none'

  if (name === 'prompts')   loadPromptsList()
  if (name === 'templates') loadTemplatesList()
  if (name === 'roles')     loadRolesList()
  if (name === 'personas')  loadPersonasList()

  refreshIcons()
}

// ── Prompt type pills ─────────────────────────────────────────────────────────
function initTypePills() {
  $('type-pills').addEventListener('click', e => {
    const pill = e.target.closest('.pill')
    if (!pill) return
    $$('#type-pills .pill').forEach(p => p.classList.remove('active'))
    pill.classList.add('active')
    state.promptType = pill.dataset.type
  })

  const modal = $('type-info-modal')
  $('btn-type-info').addEventListener('click', () => { modal.hidden = false })
  $('btn-type-info-close').addEventListener('click', () => { modal.hidden = true })
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true })
}

// ── Role traits ───────────────────────────────────────────────────────────────
function renderTraits() {
  const list = $('trait-list')
  list.replaceChildren()

  for (const [index, trait] of state.roleTraits.entries()) {
    const tag = document.createElement('span')
    tag.className = 'trait-tag'

    const text = document.createElement('span')
    text.textContent = trait
    tag.appendChild(text)

    const button = document.createElement('button')
    button.dataset.idx = String(index)
    button.title = 'Remove'
    button.innerHTML = '<i data-lucide="x"></i>'
    tag.appendChild(button)

    list.appendChild(tag)
  }
  refreshIcons()

  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.roleTraits.splice(Number(btn.dataset.idx), 1)
      renderTraits()
    })
  })
}

function initTraitModal() {
  $('btn-add-trait').addEventListener('click', () => {
    $('trait-input').value = ''
    $('trait-modal').hidden = false
    $('trait-input').focus()
  })
  $('btn-trait-cancel').addEventListener('click', () => { $('trait-modal').hidden = true })
  $('btn-trait-confirm').addEventListener('click', addTrait)
  $('trait-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTrait() })
}

function addTrait() {
  const val = $('trait-input').value.trim()
  if (val) {
    state.roleTraits.push(val)
    renderTraits()
  }
  $('trait-modal').hidden = true
}

// ── Dropdowns ─────────────────────────────────────────────────────────────────
function initDropdown(triggerId, dropdownId, stateKey, displayId) {
  const trigger  = $(triggerId)
  const dropdown = $(dropdownId)

  trigger.addEventListener('click', e => {
    e.stopPropagation()
    const isOpen = dropdown.classList.contains('open')
    closeAllDropdowns()
    if (!isOpen) {
      dropdown.classList.add('open')
      trigger.classList.add('open')
      // position below trigger
      const rect = trigger.getBoundingClientRect()
      dropdown.style.position = 'fixed'
      dropdown.style.top  = `${rect.bottom + 4}px`
      dropdown.style.left = `${rect.left}px`
      dropdown.style.width = `${rect.width}px`
    }
  })

  dropdown.addEventListener('click', e => {
    const item = e.target.closest('.dropdown-item')
    if (!item) return
    const val = item.dataset.value
    state[stateKey] = val
    $(displayId).textContent = val
    dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'))
    item.classList.add('selected')
    closeAllDropdowns()
  })
}

function closeAllDropdowns() {
  $$('.dropdown').forEach(d => d.classList.remove('open'))
  $$('.select-card').forEach(s => s.classList.remove('open'))
}

document.addEventListener('click', closeAllDropdowns)

// ── Advanced settings toggle ──────────────────────────────────────────────────
function initAdvanced() {
  $('btn-advanced').addEventListener('click', () => {
    const body    = $('advanced-body')
    const btn     = $('btn-advanced')
    const expanded = btn.getAttribute('aria-expanded') === 'true'
    btn.setAttribute('aria-expanded', String(!expanded))
    body.classList.toggle('expanded', !expanded)
    body.classList.toggle('collapsed', expanded)
  })
}

// ── Character count ───────────────────────────────────────────────────────────
function initCharCount() {
  $('input-task').addEventListener('input', () => {
    const len = $('input-task').value.length
    $('char-count').textContent = `${len} / 2000 characters`
    state.taskDescription = $('input-task').value
  })
}

// ── Role textarea ─────────────────────────────────────────────────────────────
function initRoleInput() {
  $('input-role').addEventListener('input', () => {
    state.role = $('input-role').value
  })
}

function initConstraintsInput() {
  $('input-constraints').addEventListener('input', () => {
    state.constraints = $('input-constraints').value
  })
}

// ── Generate prompt (SSE streaming) ──────────────────────────────────────────
function buildConfig() {
  return {
    type:            state.promptType,
    role:            state.role,
    roleTraits:      state.roleTraits,
    taskDescription: state.taskDescription,
    tone:            state.tone,
    outputFormat:    state.outputFormat,
    constraints:     state.constraints,
    targetModel:     state.targetModel,
    personaContext:  state.activePersona?.context ?? '',
  }
}

function setGenerating(on) {
  state.isGenerating = on
  const btn = $('btn-generate')
  if (on) {
    btn.innerHTML = '<span class="spinner"></span> Generating…'
    btn.disabled  = true
  } else {
    btn.innerHTML = '<i data-lucide="sparkles"></i> Generate Prompt'
    btn.disabled  = false
    refreshIcons()
  }
}

async function generatePrompt() {
  if (state.isGenerating) return
  setGenerating(true)

  // Show output area
  $('output-empty').hidden         = true
  $('output-loaded-notice').hidden = true
  $('output-blocks').hidden        = false
  $('output-blocks').innerHTML     = ''

  // Add streaming block
  const streamBlock = document.createElement('div')
  streamBlock.className = 'output-block block-default'
  streamBlock.innerHTML = '<div class="output-block-body"></div>'
  $('output-blocks').appendChild(streamBlock)
  const bodyEl = streamBlock.querySelector('.output-block-body')

  let accumulated = ''
  const cursor = document.createElement('span')
  cursor.className = 'cursor'
  bodyEl.appendChild(cursor)

  state.generateAbort = await aiApi.generateStream(buildConfig(), {
    onDelta(text) {
      accumulated += text
      bodyEl.textContent = accumulated
      bodyEl.appendChild(cursor)
      $('output-blocks').scrollTop = $('output-blocks').scrollHeight
    },
    onComplete(payload) {
      state.generatedPrompt = payload.generatedPrompt
      cursor.remove()
      renderOutputBlocks(payload.generatedPrompt)
      updateMetrics(payload.qualityScore, payload.qualityMetrics)
      setGenerating(false)
      $('output-filename').textContent = promptFilename()
    },
    onError(err) {
      showToast(`Error: ${err.message}`, 'error')
      setGenerating(false)
      cursor.remove()
    },
  })
}

const FORMAT_META = {
  'Structured Markdown': { ext: 'md',   mime: 'text/markdown' },
  'Plain Text':          { ext: 'txt',  mime: 'text/plain' },
  'JSON Schema':         { ext: 'json', mime: 'application/json' },
  'Numbered List':       { ext: 'txt',  mime: 'text/plain' },
  'Executive Report':    { ext: 'md',   mime: 'text/markdown' },
}

function promptFilename() {
  const type = state.promptType.replace(/-/g, '_')
  const { ext } = FORMAT_META[state.outputFormat] ?? FORMAT_META['Structured Markdown']
  return `${type}_prompt.${ext}`
}

// ── Render output as coloured blocks ─────────────────────────────────────────
function renderOutputBlocks(text) {
  const blocks = parsePromptBlocks(text)
  $('output-blocks').innerHTML = ''

  for (const { heading, body } of blocks) {
    const div = document.createElement('div')
    div.className = `output-block ${blockClass(heading)}`

    if (heading) {
      const h = document.createElement('div')
      h.className = 'output-block-header'
      h.textContent = heading
      div.appendChild(h)
    }

    const b = document.createElement('div')
    b.className = 'output-block-body'
    b.textContent = body.trim()
    div.appendChild(b)

    $('output-blocks').appendChild(div)
  }
}

function parsePromptBlocks(text) {
  const lines   = text.split('\n')
  const blocks  = []
  let current   = { heading: '', body: '' }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current.body.trim() || current.heading) blocks.push(current)
      current = { heading: line, body: '' }
    } else {
      current.body += line + '\n'
    }
  }
  if (current.body.trim() || current.heading) blocks.push(current)
  return blocks
}

function blockClass(heading) {
  const h = heading.toLowerCase()
  if (h.includes('role') || h.includes('system'))      return 'block-system'
  if (h.includes('task') || h.includes('objective'))   return 'block-task'
  if (h.includes('output') || h.includes('format'))    return 'block-format'
  if (h.includes('constraint') || h.includes('rule'))  return 'block-constraints'
  return 'block-default'
}

// ── Quality metrics ───────────────────────────────────────────────────────────
function updateMetrics(score, metrics) {
  state.qualityScore   = score
  state.qualityMetrics = metrics

  $('quality-score-text').textContent = `Score: ${score}`
  const badge = $('quality-badge')
  badge.classList.remove('low', 'mid')
  if (score < 70) badge.classList.add('low')
  else if (score < 85) badge.classList.add('mid')

  setMetric('clarity',      metrics.clarity)
  setMetric('specificity',  metrics.specificity)
  setMetric('completeness', metrics.completeness)
}

function setMetric(key, value) {
  $(`metric-${key}`).textContent = value
  $(`fill-${key}`).style.width   = `${value}%`
}

// ── AI Enhance ────────────────────────────────────────────────────────────────
async function enhanceTask() {
  const task = $('input-task').value.trim()
  if (!task) return showToast('Enter a task description first')

  const btn = $('btn-enhance')
  btn.textContent = 'Enhancing…'
  btn.disabled    = true

  try {
    const { enhanced } = await aiApi.enhance(task)
    $('input-task').value = enhanced
    state.taskDescription = enhanced
    $('char-count').textContent = `${enhanced.length} / 2000 characters`
    showToast('Task description enhanced')
  } catch (err) {
    showToast(`Enhance failed: ${err.message}`)
  } finally {
    btn.innerHTML = '<i data-lucide="wand"></i> AI Enhance'
    btn.disabled  = false
    refreshIcons()
  }
}

// ── Save draft ────────────────────────────────────────────────────────────────
async function saveDraft() {
  const payload = {
    ...buildConfig(),
    generatedPrompt: state.generatedPrompt,
    qualityScore:    state.qualityScore,
    qualityMetrics:  state.qualityMetrics,
    name: $('input-task').value.trim().slice(0, 60) || 'Untitled Prompt',
  }

  try {
    if (state.currentPromptId) {
      await promptsApi.update(state.currentPromptId, payload)
    } else {
      const saved = await promptsApi.create(payload)
      state.currentPromptId = saved._id
    }
    showToast('Draft saved')
  } catch (err) {
    showToast(`Save failed: ${err.message}`)
  }
}

// ── Copy to clipboard ─────────────────────────────────────────────────────────
async function copyPrompt() {
  if (!state.generatedPrompt) return showToast('Nothing to copy yet')

  // Prefer the modern Clipboard API (requires HTTPS or localhost).
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(state.generatedPrompt)
      showToast('Copied to clipboard')
      return
    } catch {
      // fall through to execCommand fallback
    }
  }

  // Fallback for HTTP deployments where Clipboard API is unavailable.
  const ta = document.createElement('textarea')
  ta.value = state.generatedPrompt
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(ta)
  showToast(ok ? 'Copied to clipboard' : 'Copy failed — please copy manually')
}

// ── Export as markdown ────────────────────────────────────────────────────────
function exportPrompt() {
  if (!state.generatedPrompt) return showToast('Nothing to export yet')
  const { mime } = FORMAT_META[state.outputFormat] ?? FORMAT_META['Structured Markdown']
  const blob = new Blob([state.generatedPrompt], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), {
    href:     url,
    download: promptFilename(),
  })
  a.click()
  URL.revokeObjectURL(url)
}

// ── Load saved prompts ────────────────────────────────────────────────────────
async function loadPromptsList() {
  try {
    const { data } = await promptsApi.list({ limit: 50 })
    const container = $('prompts-list')

    if (!data.length) {
      container.innerHTML = `<div class="list-empty"><i data-lucide="inbox"></i><p>No saved prompts yet. Generate one and click Save Draft.</p></div>`
      refreshIcons()
      return
    }

    container.innerHTML = data.map(p => `
      <div class="prompt-card" data-id="${p._id}">
        <div class="card-name">${esc(p.name ?? 'Untitled')}</div>
        <div class="card-desc">${esc((p.taskDescription ?? '').slice(0, 100))}${p.taskDescription?.length > 100 ? '…' : ''}</div>
        <div class="card-meta">
          <span class="card-tag accent">${esc(p.type ?? 'system')}</span>
          <span class="card-tag">${esc(p.tone ?? '')}</span>
          <span class="card-date">${fmtDate(p.updatedAt)}</span>
        </div>
        <div class="card-actions">
          <button class="card-btn" data-action="load" data-id="${p._id}">Load</button>
          <button class="card-btn danger" data-action="delete" data-id="${p._id}">Delete</button>
        </div>
      </div>`).join('')

    container.querySelectorAll('[data-action="load"]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); loadPrompt(btn.dataset.id) })
    })
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); deletePrompt(btn.dataset.id) })
    })
    refreshIcons()
  } catch (err) {
    showToast(`Failed to load prompts: ${err.message}`)
  }
}

async function loadPrompt(id) {
  try {
    const p = await promptsApi.get(id)
    applyPromptConfig(p)
    switchView('editor')
  } catch (err) {
    showToast(`Failed to load: ${err.message}`)
  }
}

async function deletePrompt(id) {
  try {
    await promptsApi.delete(id)
    if (state.currentPromptId === id) state.currentPromptId = null
    loadPromptsList()
    showToast('Prompt deleted')
  } catch (err) {
    showToast(`Delete failed: ${err.message}`)
  }
}

// ── Load templates ────────────────────────────────────────────────────────────
let editingTemplateId = null

async function loadTemplatesList() {
  try {
    const { data } = await templatesApi.list()
    const container = $('templates-list')

    const createCard = `
      <div class="template-card template-card--create" id="card-new-template">
        <div class="create-card-inner">
          <i data-lucide="plus-circle"></i>
          <span>Create Template</span>
        </div>
      </div>`

    container.innerHTML = createCard + data.map(t => `
      <div class="template-card" data-id="${t._id}">
        <div class="card-name">${esc(t.name)}</div>
        <div class="card-desc">${esc(t.description ?? '')}</div>
        <div class="card-meta">
          <span class="card-tag accent">${esc(t.type)}</span>
          <span class="card-tag">${esc(t.category ?? '')}</span>
        </div>
        <div class="card-actions">
          <button class="card-btn" data-action="use" data-id="${t._id}">Use Template</button>
          <button class="card-btn" data-action="edit" data-id="${t._id}">Edit</button>
          ${!t.isDefault ? `<button class="card-btn danger" data-action="delete" data-id="${t._id}">Delete</button>` : ''}
        </div>
      </div>`).join('')

    $('card-new-template').addEventListener('click', openCreateTemplateModal)

    container.querySelectorAll('[data-action="use"]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); useTemplate(btn.dataset.id) })
    })
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const template = data.find(t => t._id === btn.dataset.id)
        if (template) openEditTemplateModal(template)
      })
    })
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); deleteTemplate(btn.dataset.id) })
    })
    refreshIcons()
  } catch (err) {
    showToast(`Failed to load templates: ${err.message}`)
  }
}

// ── Template create / delete ──────────────────────────────────────────────────
function openCreateTemplateModal() {
  editingTemplateId = null
  ;['tmpl-name', 'tmpl-description', 'tmpl-category', 'tmpl-role', 'tmpl-task', 'tmpl-constraints'].forEach(id => {
    const el = $(id)
    if (el) el.value = ''
  })
  $('template-modal-title').textContent    = 'New Template'
  $('btn-template-modal-save').textContent = 'Create Template'
  $('template-modal').hidden = false
}

function openEditTemplateModal(template) {
  editingTemplateId = template._id
  $('tmpl-name').value        = template.name ?? ''
  $('tmpl-description').value = template.description ?? ''
  $('tmpl-category').value    = template.category ?? ''
  $('tmpl-role').value        = template.role ?? ''
  $('tmpl-task').value        = template.taskDescription ?? ''
  $('tmpl-constraints').value = template.constraints ?? ''
  $('tmpl-type').value        = template.type ?? 'system'
  $('tmpl-tone').value        = template.tone ?? 'Professional & Precise'
  $('tmpl-format').value      = template.outputFormat ?? 'Structured Markdown'
  $('tmpl-model').value       = template.targetModel ?? 'claude-sonnet-4-6'
  $('template-modal-title').textContent    = 'Edit Template'
  $('btn-template-modal-save').textContent = 'Save Changes'
  $('template-modal').hidden = false
}

function closeCreateTemplateModal() {
  editingTemplateId = null
  $('template-modal').hidden = true
}

async function submitCreateTemplate() {
  const name            = $('tmpl-name').value.trim()
  const description     = $('tmpl-description').value.trim()
  const category        = $('tmpl-category').value.trim()
  const type            = $('tmpl-type').value
  const role            = $('tmpl-role').value.trim()
  const taskDescription = $('tmpl-task').value.trim()
  const tone            = $('tmpl-tone').value
  const outputFormat    = $('tmpl-format').value
  const constraints     = $('tmpl-constraints').value.trim()
  const targetModel     = $('tmpl-model').value

  if (!name || !description || !category || !taskDescription) {
    showToast('Please fill in all required fields')
    return
  }

  const isEditing = !!editingTemplateId
  const btn = $('btn-template-modal-save')
  btn.disabled    = true
  btn.textContent = isEditing ? 'Saving…' : 'Creating…'

  try {
    if (isEditing) {
      await templatesApi.update(editingTemplateId, { name, description, category, type, role, taskDescription, tone, outputFormat, constraints, targetModel })
      closeCreateTemplateModal()
      showToast(`Template "${name}" updated`)
    } else {
      await templatesApi.create({ name, description, category, type, role, taskDescription, tone, outputFormat, constraints, targetModel })
      closeCreateTemplateModal()
      showToast(`Template "${name}" created`)
    }
    await loadTemplatesList()
  } catch (err) {
    showToast(`Failed to ${isEditing ? 'update' : 'create'} template: ${err.message}`)
  } finally {
    btn.disabled    = false
    btn.textContent = isEditing ? 'Save Changes' : 'Create Template'
  }
}

async function deleteTemplate(id) {
  if (!confirm('Delete this template? This cannot be undone.')) return
  try {
    await templatesApi.delete(id)
    showToast('Template deleted')
    await loadTemplatesList()
  } catch (err) {
    showToast(`Failed to delete template: ${err.message}`)
  }
}

// ── Roles ─────────────────────────────────────────────────────────────────────
const CATEGORY_ORDER = ['Engineering', 'Architecture', 'Business', 'Other']

let editingRoleId = null

async function loadRolesList() {
  const container = $('roles-list')
  if (!container) return

  try {
    const { data } = await rolesApi.list()

    if (!data.length) {
      container.innerHTML = `<div class="list-empty"><i data-lucide="briefcase"></i><p>No roles yet.</p></div>`
      refreshIcons()
      return
    }

    // Group by category in defined order
    const grouped = {}
    for (const role of data) {
      const cat = role.category ?? 'Other'
      ;(grouped[cat] = grouped[cat] ?? []).push(role)
    }

    const createCard = `
      <div class="role-card template-card--create" id="card-new-role">
        <div class="create-card-inner">
          <i data-lucide="plus-circle"></i>
          <span>Create Role</span>
        </div>
      </div>`

    const categories = CATEGORY_ORDER.filter(c => grouped[c])
    const html = categories.map(cat => `
      <div class="role-group">
        <div class="role-group-label">${esc(cat)}</div>
        <div class="cards-grid">
          ${cat === categories[0] ? createCard : ''}
          ${grouped[cat].map(r => `
            <div class="role-card" data-id="${r._id}">
              <div class="card-name">${esc(r.name)}</div>
              <div class="card-desc">${esc(r.description ?? '')}</div>
              ${r.skills?.length ? `<div class="card-meta">${r.skills.map(s => `<span class="card-tag">${esc(s)}</span>`).join('')}</div>` : ''}
              <div class="card-actions">
                <button class="card-btn" data-action="use" data-id="${r._id}">Use Role</button>
                <button class="card-btn" data-action="edit" data-id="${r._id}">Edit</button>
                <button class="card-btn" data-action="persona" data-id="${r._id}">Save as Persona</button>
                ${!r.isDefault ? `<button class="card-btn danger" data-action="delete" data-id="${r._id}">Delete</button>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('')

    container.innerHTML = html

    $('card-new-role')?.addEventListener('click', openCreateRoleModal)

    container.querySelectorAll('[data-action="use"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const role = data.find(r => r._id === btn.dataset.id)
        if (role) activateRole(role)
      })
    })
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const role = data.find(r => r._id === btn.dataset.id)
        if (role) openEditRoleModal(role)
      })
    })
    container.querySelectorAll('[data-action="persona"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const role = data.find(r => r._id === btn.dataset.id)
        if (role) openPersonaFromRole(role)
      })
    })
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); deleteRole(btn.dataset.id) })
    })
    refreshIcons()
  } catch (err) {
    showToast(`Failed to load roles: ${err.message}`)
  }
}

function activateRole(role) {
  state.activePersonaId = role._id
  state.activePersona   = { context: role.context, name: role.name }
  $('persona-display').textContent = role.name
  refreshPersonaDropdown()
  switchView('editor')
  showToast(`Role "${role.name}" activated`)
}

function openCreateRoleModal() {
  editingRoleId = null
  ;['role-name', 'role-description', 'role-context', 'role-skills'].forEach(id => {
    const el = $(id)
    if (el) el.value = ''
  })
  $('role-category').value             = 'Engineering'
  $('role-modal-title').textContent    = 'New Role'
  $('btn-role-modal-save').textContent = 'Create Role'
  $('role-modal').hidden = false
}

function openEditRoleModal(role) {
  editingRoleId = role._id
  $('role-name').value        = role.name ?? ''
  $('role-description').value = role.description ?? ''
  $('role-context').value     = role.context ?? ''
  $('role-skills').value      = (role.skills ?? []).join(', ')
  $('role-category').value    = role.category ?? 'Engineering'
  $('role-modal-title').textContent    = 'Edit Role'
  $('btn-role-modal-save').textContent = 'Save Changes'
  $('role-modal').hidden = false
}

function closeCreateRoleModal() {
  editingRoleId = null
  $('role-modal').hidden = true
}

function openPersonaFromRole(role) {
  editingPersonaId = null
  $('persona-name').value        = role.name ?? ''
  $('persona-description').value = role.description ?? ''
  $('persona-context').value     = role.context ?? ''
  $('persona-skills').value      = (role.skills ?? []).join(', ')
  $('persona-modal-title').textContent    = 'New Persona'
  $('btn-persona-modal-save').textContent = 'Create Persona'
  $('persona-modal').hidden = false
}

async function submitCreateRole() {
  const name        = $('role-name').value.trim()
  const category    = $('role-category').value
  const description = $('role-description').value.trim()
  const context     = $('role-context').value.trim()
  const skillsRaw   = $('role-skills').value.trim()
  const skills      = skillsRaw
    ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : []

  if (!name || !description || !context) {
    showToast('Please fill in name, description, and context')
    return
  }

  const isEditing = !!editingRoleId
  const btn = $('btn-role-modal-save')
  btn.disabled    = true
  btn.textContent = isEditing ? 'Saving…' : 'Creating…'

  try {
    if (isEditing) {
      await rolesApi.update(editingRoleId, { name, category, description, context, skills })
      if (state.activePersonaId === editingRoleId) {
        state.activePersona = { ...state.activePersona, name, context }
        $('persona-display').textContent = name
      }
      closeCreateRoleModal()
      showToast(`Role "${name}" updated`)
    } else {
      await rolesApi.create({ name, category, description, context, skills })
      closeCreateRoleModal()
      showToast(`Role "${name}" created`)
    }
    await loadRolesList()
  } catch (err) {
    showToast(`Failed to ${isEditing ? 'update' : 'create'} role: ${err.message}`)
  } finally {
    btn.disabled    = false
    btn.textContent = isEditing ? 'Save Changes' : 'Create Role'
  }
}

async function deleteRole(id) {
  if (!confirm('Delete this role? This cannot be undone.')) return
  try {
    await rolesApi.delete(id)
    if (state.activePersonaId === id) {
      state.activePersonaId = null
      state.activePersona   = null
      $('persona-display').textContent = 'No persona — prompts are generic'
    }
    showToast('Role deleted')
    await loadRolesList()
  } catch (err) {
    showToast(`Failed to delete role: ${err.message}`)
  }
}

// ── Personas ──────────────────────────────────────────────────────────────────
function refreshPersonaDropdown() {
  const dropdown = $('dropdown-persona')
  if (!dropdown) return

  const noneItem = `<button class="dropdown-item" data-persona-id="">No persona — prompts are generic</button>`
  const items = state.personas.map(p =>
    `<button class="dropdown-item${state.activePersonaId === p._id ? ' selected' : ''}" data-persona-id="${p._id}">${esc(p.name)}</button>`
  ).join('')
  dropdown.innerHTML = noneItem + items

  dropdown.querySelectorAll('.dropdown-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.personaId
      if (id) {
        const persona = state.personas.find(p => p._id === id)
        state.activePersonaId = id
        state.activePersona   = persona ?? null
        $('persona-display').textContent = persona ? persona.name : 'No persona — prompts are generic'
      } else {
        state.activePersonaId = null
        state.activePersona   = null
        $('persona-display').textContent = 'No persona — prompts are generic'
      }
      closeAllDropdowns()
    })
  })
}

let editingPersonaId = null

async function loadPersonasList() {
  try {
    const { data } = await personasApi.list()
    state.personas = data
    refreshPersonaDropdown()

    const container = $('personas-list')
    if (!container) return

    if (!data.length) {
      container.innerHTML = `<div class="list-empty"><i data-lucide="user-round"></i><p>No personas yet. Create one to give the AI context about who you are.</p></div>`
      refreshIcons()
      return
    }

    container.innerHTML = data.map(p => `
      <div class="persona-card" data-id="${p._id}">
        <div class="card-name">${esc(p.name)}</div>
        <div class="card-desc">${esc(p.description ?? '')}</div>
        ${p.skills?.length ? `<div class="card-meta">${p.skills.map(s => `<span class="card-tag">${esc(s)}</span>`).join('')}</div>` : ''}
        <div class="card-actions">
          <button class="card-btn" data-action="activate" data-id="${p._id}">Use in Editor</button>
          <button class="card-btn" data-action="edit" data-id="${p._id}">Edit</button>
          <button class="card-btn danger" data-action="delete" data-id="${p._id}">Delete</button>
        </div>
      </div>`).join('')

    container.querySelectorAll('[data-action="activate"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const persona = data.find(p => p._id === btn.dataset.id)
        if (persona) {
          state.activePersonaId = persona._id
          state.activePersona   = persona
          $('persona-display').textContent = persona.name
          refreshPersonaDropdown()
          switchView('editor')
          showToast(`Persona "${persona.name}" activated`)
        }
      })
    })
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const persona = data.find(p => p._id === btn.dataset.id)
        if (persona) openEditPersonaModal(persona)
      })
    })
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); deletePersona(btn.dataset.id) })
    })
    refreshIcons()
  } catch (err) {
    showToast(`Failed to load personas: ${err.message}`)
  }
}

function openCreatePersonaModal() {
  editingPersonaId = null
  ;['persona-name', 'persona-description', 'persona-context', 'persona-skills'].forEach(id => {
    const el = $(id)
    if (el) el.value = ''
  })
  $('persona-modal-title').textContent    = 'New Persona'
  $('btn-persona-modal-save').textContent = 'Create Persona'
  $('persona-modal').hidden = false
}

function openEditPersonaModal(persona) {
  editingPersonaId = persona._id
  $('persona-name').value        = persona.name ?? ''
  $('persona-description').value = persona.description ?? ''
  $('persona-context').value     = persona.context ?? ''
  $('persona-skills').value      = (persona.skills ?? []).join(', ')
  $('persona-modal-title').textContent    = 'Edit Persona'
  $('btn-persona-modal-save').textContent = 'Save Changes'
  $('persona-modal').hidden = false
}

function closeCreatePersonaModal() {
  editingPersonaId = null
  $('persona-modal').hidden = true
}

async function submitCreatePersona() {
  const name        = $('persona-name').value.trim()
  const description = $('persona-description').value.trim()
  const context     = $('persona-context').value.trim()
  const skillsRaw   = $('persona-skills').value.trim()
  const skills      = skillsRaw
    ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : []

  if (!name || !description || !context) {
    showToast('Please fill in name, description, and context')
    return
  }

  const isEditing = !!editingPersonaId
  const btn = $('btn-persona-modal-save')
  btn.disabled    = true
  btn.textContent = isEditing ? 'Saving…' : 'Creating…'

  try {
    if (isEditing) {
      await personasApi.update(editingPersonaId, { name, description, context, skills })
      if (state.activePersonaId === editingPersonaId) {
        state.activePersona = { ...state.activePersona, name, description, context, skills }
        $('persona-display').textContent = name
      }
      closeCreatePersonaModal()
      showToast(`Persona "${name}" updated`)
    } else {
      await personasApi.create({ name, description, context, skills })
      closeCreatePersonaModal()
      showToast(`Persona "${name}" created`)
    }
    await loadPersonasList()
  } catch (err) {
    showToast(`Failed to ${isEditing ? 'update' : 'create'} persona: ${err.message}`)
  } finally {
    btn.disabled    = false
    btn.textContent = isEditing ? 'Save Changes' : 'Create Persona'
  }
}

async function deletePersona(id) {
  if (!confirm('Delete this persona? This cannot be undone.')) return
  try {
    await personasApi.delete(id)
    if (state.activePersonaId === id) {
      state.activePersonaId = null
      state.activePersona   = null
      $('persona-display').textContent = 'No persona — prompts are generic'
    }
    showToast('Persona deleted')
    await loadPersonasList()
  } catch (err) {
    showToast(`Failed to delete persona: ${err.message}`)
  }
}

async function useTemplate(id) {
  try {
    const t = await templatesApi.get(id)
    applyPromptConfig(t)
    state.currentPromptId = null
    switchView('editor')
    showToast(`Template "${t.name}" loaded`)
  } catch (err) {
    showToast(`Failed to load template: ${err.message}`)
  }
}

// ── Apply config to UI ────────────────────────────────────────────────────────
function applyPromptConfig(p) {
  // Prompt type
  state.promptType = p.type ?? 'system'
  $$('#type-pills .pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.type === state.promptType)
  })

  // Role
  state.role = p.role ?? ''
  $('input-role').value = state.role

  // Traits
  state.roleTraits = [...(p.roleTraits ?? [])]
  renderTraits()

  // Task
  state.taskDescription = p.taskDescription ?? ''
  $('input-task').value = state.taskDescription
  $('char-count').textContent = `${state.taskDescription.length} / 2000 characters`

  // Tone
  state.tone = p.tone ?? 'Professional & Precise'
  $('tone-display').textContent = state.tone

  // Format
  state.outputFormat = p.outputFormat ?? 'Structured Markdown'
  $('format-display').textContent = state.outputFormat

  // Constraints
  state.constraints = p.constraints ?? ''
  $('input-constraints').value = state.constraints

  // Model
  state.targetModel = p.targetModel ?? 'claude-sonnet-4-6'
  $('model-display').textContent = state.targetModel

  // Generated prompt (if re-loading a saved prompt)
  if (p.generatedPrompt) {
    state.generatedPrompt = p.generatedPrompt
    $('output-empty').hidden         = true
    $('output-loaded-notice').hidden = false
    $('output-blocks').hidden        = false
    renderOutputBlocks(p.generatedPrompt)
    $('output-filename').textContent = promptFilename()
  }
  if (p.qualityScore != null) {
    updateMetrics(p.qualityScore, p.qualityMetrics)
  }

  // Record saved ID if this is a saved prompt
  if (p._id) state.currentPromptId = p._id
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

let toastTimer = null
function showToast(msg) {
  const t = $('toast')
  t.textContent = msg
  t.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { t.hidden = true }, 3000)
}

// ── Wire up all event listeners ───────────────────────────────────────────────
function init() {
  // Nav
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view))
  })

  // "New Prompt" from My Prompts view
  $('btn-new-from-prompts')?.addEventListener('click', () => {
    state.currentPromptId = null
    switchView('editor')
  })

  // Persona selector dropdown
  $('select-persona')?.addEventListener('click', e => {
    e.stopPropagation()
    const dropdown = $('dropdown-persona')
    const isOpen   = dropdown.classList.contains('open')
    closeAllDropdowns()
    if (!isOpen) {
      dropdown.classList.add('open')
      $('select-persona').classList.add('open')
      const rect = $('select-persona').getBoundingClientRect()
      dropdown.style.position = 'fixed'
      dropdown.style.top      = `${rect.bottom + 4}px`
      dropdown.style.left     = `${rect.left}px`
      dropdown.style.width    = `${rect.width}px`
    }
  })

  // Roles view and modal
  $('btn-new-role')?.addEventListener('click', openCreateRoleModal)
  $('btn-role-modal-close')?.addEventListener('click', closeCreateRoleModal)
  $('btn-role-modal-cancel')?.addEventListener('click', closeCreateRoleModal)
  $('btn-role-modal-save')?.addEventListener('click', submitCreateRole)
  $('role-modal')?.addEventListener('click', e => {
    if (e.target === $('role-modal')) closeCreateRoleModal()
  })

  // Persona view and modal
  $('btn-manage-personas')?.addEventListener('click', () => switchView('personas'))
  $('btn-new-persona')?.addEventListener('click', openCreatePersonaModal)
  $('btn-persona-modal-close')?.addEventListener('click', closeCreatePersonaModal)
  $('btn-persona-modal-cancel')?.addEventListener('click', closeCreatePersonaModal)
  $('btn-persona-modal-save')?.addEventListener('click', submitCreatePersona)
  $('persona-modal')?.addEventListener('click', e => {
    if (e.target === $('persona-modal')) closeCreatePersonaModal()
  })

  // Template modal
  $('btn-new-template')?.addEventListener('click', openCreateTemplateModal)
  $('btn-template-modal-close')?.addEventListener('click', closeCreateTemplateModal)
  $('btn-template-modal-cancel')?.addEventListener('click', closeCreateTemplateModal)
  $('btn-template-modal-save')?.addEventListener('click', submitCreateTemplate)
  $('template-modal')?.addEventListener('click', e => {
    if (e.target === $('template-modal')) closeCreateTemplateModal()
  })

  initTypePills()
  initTraitModal()
  initCharCount()
  initRoleInput()
  initConstraintsInput()
  initAdvanced()

  // Dropdowns
  initDropdown('select-tone',   'dropdown-tone',   'tone',         'tone-display')
  initDropdown('select-format', 'dropdown-format', 'outputFormat', 'format-display')
  initDropdown('select-model',  'dropdown-model',  'targetModel',  'model-display')

  // Actions
  $('btn-generate').addEventListener('click', generatePrompt)
  $('btn-enhance').addEventListener('click',  enhanceTask)
  $('btn-save').addEventListener('click',     saveDraft)
  $('btn-copy').addEventListener('click',     copyPrompt)
  $('btn-export').addEventListener('click',   exportPrompt)
  $('btn-save-api-token')?.addEventListener('click', saveApiToken)

  const tokenInput = $('input-api-token')
  if (tokenInput) {
    tokenInput.value = window.sessionStorage.getItem('promptforge_api_token') ?? ''
  }

  // Load personas so the editor dropdown is populated on startup
  loadPersonasList()

  // Render icons
  refreshIcons()
}

document.addEventListener('DOMContentLoaded', init)

function saveApiToken() {
  const value = $('input-api-token')?.value.trim() ?? ''
  if (!value) {
    window.sessionStorage.removeItem('promptforge_api_token')
    showToast('API token cleared')
    return
  }

  window.sessionStorage.setItem('promptforge_api_token', value)
  showToast('API token saved for this tab')
}
