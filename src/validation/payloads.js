const PROMPT_TYPES = new Set(['system', 'task', 'few-shot', 'chain-of-thought', 'react'])
const MAX_ROLE_TRAITS = 12

function createValidationError(message, status = 400) {
  const err = new Error(message)
  err.status = status
  return err
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createValidationError(`${label} must be an object`)
  }
}

function sanitizeString(value, { field, maxLength, allowEmpty = true } = {}) {
  if (value == null) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw createValidationError(`${field} must be a string`)
  }

  const trimmed = value.trim()
  if (!allowEmpty && !trimmed) {
    throw createValidationError(`${field} is required`)
  }
  if (trimmed.length > maxLength) {
    throw createValidationError(`${field} must be ${maxLength} characters or fewer`)
  }
  return trimmed
}

function sanitizeOptionalNumber(value, { field, min = 0, max = 100 } = {}) {
  if (value == null) {
    return undefined
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw createValidationError(`${field} must be a number`)
  }
  if (value < min || value > max) {
    throw createValidationError(`${field} must be between ${min} and ${max}`)
  }
  return Math.round(value)
}

function sanitizeRoleTraits(value) {
  if (value == null) {
    return undefined
  }
  if (!Array.isArray(value)) {
    throw createValidationError('roleTraits must be an array')
  }
  if (value.length > MAX_ROLE_TRAITS) {
    throw createValidationError(`roleTraits must contain ${MAX_ROLE_TRAITS} items or fewer`)
  }

  return value.map((trait, index) => sanitizeString(trait, {
    field: `roleTraits[${index}]`,
    maxLength: 60,
    allowEmpty: false,
  }))
}

function sanitizeQualityMetrics(value) {
  if (value == null) {
    return undefined
  }

  assertPlainObject(value, 'qualityMetrics')
  return {
    clarity: sanitizeOptionalNumber(value.clarity, { field: 'qualityMetrics.clarity' }),
    specificity: sanitizeOptionalNumber(value.specificity, { field: 'qualityMetrics.specificity' }),
    completeness: sanitizeOptionalNumber(value.completeness, { field: 'qualityMetrics.completeness' }),
  }
}

function pickDefinedEntries(entries) {
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined))
}

export function validatePromptPayload(body, { partial = false } = {}) {
  assertPlainObject(body, 'Prompt payload')

  const role = sanitizeString(body.role, { field: 'role', maxLength: 500, allowEmpty: true })
  const roleTraits = sanitizeRoleTraits(body.roleTraits)
  const constraints = sanitizeString(body.constraints, {
    field: 'constraints',
    maxLength: 500,
    allowEmpty: true,
  })
  const generatedPrompt = sanitizeString(body.generatedPrompt, {
    field: 'generatedPrompt',
    maxLength: 20000,
    allowEmpty: true,
  })

  const payload = pickDefinedEntries([
    ['name', sanitizeString(body.name, { field: 'name', maxLength: 120, allowEmpty: false })],
    ['type', sanitizeString(body.type, { field: 'type', maxLength: 32, allowEmpty: false })],
    ['role', partial ? role : (role ?? '')],
    ['roleTraits', partial ? roleTraits : (roleTraits ?? [])],
    ['taskDescription', sanitizeString(body.taskDescription, {
      field: 'taskDescription',
      maxLength: 2000,
      allowEmpty: false,
    })],
    ['tone', sanitizeString(body.tone, { field: 'tone', maxLength: 120, allowEmpty: false })],
    ['outputFormat', sanitizeString(body.outputFormat, {
      field: 'outputFormat',
      maxLength: 120,
      allowEmpty: false,
    })],
    ['constraints', partial ? constraints : (constraints ?? '')],
    ['targetModel', sanitizeString(body.targetModel, {
      field: 'targetModel',
      maxLength: 120,
      allowEmpty: false,
    })],
    ['generatedPrompt', partial ? generatedPrompt : (generatedPrompt ?? '')],
    ['qualityScore', sanitizeOptionalNumber(body.qualityScore, { field: 'qualityScore' })],
    ['qualityMetrics', sanitizeQualityMetrics(body.qualityMetrics)],
  ])

  if (payload.type && !PROMPT_TYPES.has(payload.type)) {
    throw createValidationError('type is invalid')
  }

  if (!partial) {
    const requiredFields = ['name', 'type', 'taskDescription', 'tone', 'outputFormat', 'targetModel']
    for (const field of requiredFields) {
      if (!(field in payload)) {
        throw createValidationError(`${field} is required`)
      }
    }
  }

  if (partial && Object.keys(payload).length === 0) {
    throw createValidationError('No valid fields provided for update')
  }

  return payload
}

export function validateTemplatePayload(body, { partial = false } = {}) {
  assertPlainObject(body, 'Template payload')

  const role = sanitizeString(body.role, { field: 'role', maxLength: 500, allowEmpty: true })
  const roleTraits = sanitizeRoleTraits(body.roleTraits)
  const constraints = sanitizeString(body.constraints, {
    field: 'constraints',
    maxLength: 500,
    allowEmpty: true,
  })

  const payload = pickDefinedEntries([
    ['name', sanitizeString(body.name, { field: 'name', maxLength: 120, allowEmpty: false })],
    ['description', sanitizeString(body.description, {
      field: 'description',
      maxLength: 500,
      allowEmpty: false,
    })],
    ['category', sanitizeString(body.category, { field: 'category', maxLength: 80, allowEmpty: false })],
    ['type', sanitizeString(body.type, { field: 'type', maxLength: 32, allowEmpty: false })],
    ['role', partial ? role : (role ?? '')],
    ['roleTraits', partial ? roleTraits : (roleTraits ?? [])],
    ['taskDescription', sanitizeString(body.taskDescription, {
      field: 'taskDescription',
      maxLength: 2000,
      allowEmpty: false,
    })],
    ['tone', sanitizeString(body.tone, { field: 'tone', maxLength: 120, allowEmpty: false })],
    ['outputFormat', sanitizeString(body.outputFormat, {
      field: 'outputFormat',
      maxLength: 120,
      allowEmpty: false,
    })],
    ['constraints', partial ? constraints : (constraints ?? '')],
    ['targetModel', sanitizeString(body.targetModel, {
      field: 'targetModel',
      maxLength: 120,
      allowEmpty: false,
    })],
  ])

  if (payload.type && !PROMPT_TYPES.has(payload.type)) {
    throw createValidationError('type is invalid')
  }

  if (!partial) {
    const requiredFields = [
      'name',
      'description',
      'category',
      'type',
      'taskDescription',
      'tone',
      'outputFormat',
      'targetModel',
    ]
    for (const field of requiredFields) {
      if (!(field in payload)) {
        throw createValidationError(`${field} is required`)
      }
    }
  }

  if (partial && Object.keys(payload).length === 0) {
    throw createValidationError('No valid fields provided for update')
  }

  return payload
}

export function validateAiGeneratePayload(body) {
  const payload = validatePromptPayload({
    ...body,
    name: body?.name ?? 'Generated Prompt',
  }, { partial: false })

  return pickDefinedEntries([
    ['type', payload.type],
    ['role', payload.role],
    ['roleTraits', payload.roleTraits],
    ['taskDescription', payload.taskDescription],
    ['tone', payload.tone],
    ['outputFormat', payload.outputFormat],
    ['constraints', payload.constraints],
    ['targetModel', payload.targetModel],
  ])
}

export function validateEnhancePayload(body) {
  assertPlainObject(body, 'Enhance payload')
  return {
    taskDescription: sanitizeString(body.taskDescription, {
      field: 'taskDescription',
      maxLength: 2000,
      allowEmpty: false,
    }),
  }
}

export function validateListQuery(query) {
  const page = Number.parseInt(String(query.page ?? '1'), 10)
  const limit = Number.parseInt(String(query.limit ?? '20'), 10)
  const sort = query.sort === 'asc' ? 'asc' : 'desc'

  if (!Number.isInteger(page) || page < 1) {
    throw createValidationError('page must be a positive integer')
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createValidationError('limit must be between 1 and 100')
  }

  return { page, limit, sort }
}

export function validateCategoryQuery(query) {
  const category = query.category == null
    ? undefined
    : sanitizeString(query.category, { field: 'category', maxLength: 80, allowEmpty: false })

  return { category }
}

export function validateIdParam(value, fieldName = 'id') {
  const id = sanitizeString(value, { field: fieldName, maxLength: 120, allowEmpty: false })
  if (!/^[A-Za-z0-9._:-]+$/.test(id)) {
    throw createValidationError(`${fieldName} contains invalid characters`)
  }
  return id
}
