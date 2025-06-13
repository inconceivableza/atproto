/* eslint-env node */
/* eslint-disable import/order */

'use strict'

const { registerInstrumentations } = require('@opentelemetry/instrumentation')
const otel = require('@opentelemetry/api')
const {
  BetterSqlite3Instrumentation,
} = require('opentelemetry-plugin-better-sqlite3')
const {
  UndiciInstrumentation
} = require('@opentelemetry/instrumentation-undici')
const { TracerProvider, tracer } = require('dd-trace') // Only works with commonjs
  .init({ logInjection: true })
  .use('express', {
    hooks: { request: maintainXrpcResource },
  })

const tracerProvider = new TracerProvider()
const otelTracer = otel.trace.getTracer('pds')

registerInstrumentations({
  tracerProvider: tracerProvider,
  instrumentations: [
    new BetterSqlite3Instrumentation(),
    new UndiciInstrumentation({
      requestHook: (span, req) => {
        try {
          const activeSpan = tracer.scope().active()
          const childSpan = tracer.startSpan('undici.requestHook', {childOf: activeSpan})
          childSpan.setTag('http.method', req.method)
          childSpan.setTag('http.origin', req.origin)
          childSpan.setTag('http.path', req.path)
          childSpan.finish()
        } catch (error) {
          console.error("OpenTelemetry UndiciInstrumentation request hook error:", error);
        }
      },
    })
  ],
})

tracerProvider.register()

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
