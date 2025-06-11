/* eslint-env node */
/* eslint-disable import/order */

'use strict'

const { registerInstrumentations } = require('@opentelemetry/instrumentation')
const {
  BetterSqlite3Instrumentation,
} = require('opentelemetry-plugin-better-sqlite3')
const { TracerProvider } = require('dd-trace') // Only works with commonjs
  .init({ logInjection: true })
  .use('express', {
    hooks: { request: maintainXrpcResource },
  })
  .use('undici', {
    hooks: { request: (span, req) => { span.setTag('http.url', req.origin + req.path); span.setTag('debug-propagate', 'pds-dd-trace'); }}
  })

const tracer = new TracerProvider()
tracer.register()

registerInstrumentations({
  tracerProvider: tracer,
  instrumentations: [new BetterSqlite3Instrumentation()],
})

const path = require('node:path')

function maintainXrpcResource(span, req) {
  // Show actual xrpc method as resource rather than the route pattern
  if (span && req.originalUrl?.startsWith('/xrpc/')) {
    span.setTag(
      'resource.name',
      [
        req.method,
        path.posix.join(req.baseUrl || '', req.path || '', '/').slice(0, -1), // Ensures no trailing slash
      ]
        .filter(Boolean)
        .join(' '),
    )
  }
}
