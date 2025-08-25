FROM node:20.11-alpine as build

RUN corepack enable

WORKDIR /app

COPY ./package.json ./
RUN corepack prepare --activate

COPY ./tsconfig ./tsconfig
COPY ./packages/bsky/package.json ./packages/bsky/package.json
COPY ./packages/api/package.json ./packages/api/package.json
COPY ./packages/common/package.json ./packages/common/package.json
COPY ./packages/common-web/package.json ./packages/common-web/package.json
COPY ./packages/crypto/package.json ./packages/crypto/package.json
COPY ./packages/did/package.json ./packages/did/package.json
COPY ./packages/identity/package.json ./packages/identity/package.json
COPY ./packages/sync/package.json ./packages/sync/package.json
COPY ./packages/syntax/package.json ./packages/syntax/package.json
COPY ./packages/lexicon/package.json ./packages/lexicon/package.json
COPY ./packages/repo/package.json ./packages/repo/package.json
COPY ./packages/xrpc/package.json ./packages/xrpc/package.json
COPY ./packages/xrpc-server/package.json ./packages/xrpc-server/package.json
COPY ./packages/internal/fetch-node/package.json ./packages/internal/fetch-node/package.json
COPY ./packages/internal/fetch/package.json ./packages/internal/fetch/package.json
COPY ./packages/internal/pipe/package.json ./packages/internal/pipe/package.json
COPY ./packages/internal/xrpc-utils/package.json ./packages/internal/xrpc-utils/package.json
COPY ./services/bsky/package.json ./services/bsky/package.json
COPY ./package.json ./package.json
COPY ./pnpm-lock.yaml ./pnpm-lock.yaml
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml 

# install all deps
RUN pnpm install --frozen-lockfile > /dev/null

# Move files into the image and install
COPY ./*.* ./
# NOTE bsky's transitive dependencies go here: if that changes, this needs to be updated.
COPY ./tsconfig ./tsconfig
COPY ./packages/bsky ./packages/bsky
COPY ./packages/api ./packages/api
COPY ./packages/common ./packages/common
COPY ./packages/common-web ./packages/common-web
COPY ./packages/crypto ./packages/crypto
COPY ./packages/did ./packages/did
COPY ./packages/identity ./packages/identity
COPY ./packages/sync ./packages/sync
COPY ./packages/syntax ./packages/syntax
COPY ./packages/lexicon ./packages/lexicon
COPY ./packages/repo ./packages/repo
COPY ./packages/xrpc ./packages/xrpc
COPY ./packages/xrpc-server ./packages/xrpc-server
COPY ./packages/internal/fetch-node ./packages/internal/fetch-node
COPY ./packages/internal/fetch ./packages/internal/fetch
COPY ./packages/internal/pipe ./packages/internal/pipe
COPY ./packages/internal/xrpc-utils ./packages/internal/xrpc-utils
COPY ./services/bsky ./services/bsky
# build all packages with external node_modules
RUN pnpm build 
# clean up
RUN rm -rf node_modules
# install only prod deps, hoisted to root node_modules dir
RUN pnpm install --prod --shamefully-hoist --frozen-lockfile --prefer-offline > /dev/null

WORKDIR services/bsky

# Uses assets from build stage to reduce build size
FROM node:20.11-alpine

# dumb-init is used to handle signals properly.
# runit is installed so it can be (optionally) used for logging via svlogd.
RUN apk add --update dumb-init runit


# Avoid zombie processes, handle signal forwarding
ENTRYPOINT ["dumb-init", "--"]

WORKDIR /app/services/bsky
COPY --from=build /app /app

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# https://github.com/nodejs/docker-node/blob/master/docs/BestPractices.md#non-root-user
USER node
CMD ["node", "--heapsnapshot-signal=SIGUSR2", "--enable-source-maps", "api.js"]

LABEL org.opencontainers.image.source=https://github.com/bluesky-social/atproto
LABEL org.opencontainers.image.description="Bsky App View"
LABEL org.opencontainers.image.licenses=MIT
