export function now(): string {
  return new Date().toISOString()
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function notSoftDeletedClause(alias?: string) {
  const col = alias ? `${alias}.takedownId` : 'takedownId'
  return `${col} IS NULL`
}
