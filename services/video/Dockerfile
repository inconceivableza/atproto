FROM node:20.11-alpine AS build

RUN corepack enable

WORKDIR /app

COPY ./package.json ./
RUN corepack prepare --activate

# Move files into the image and install
COPY ./*.* ./
COPY ./tsconfig ./tsconfig
COPY ./lexicons ./lexicons
COPY ./packages/internal ./packages/internal
COPY ./packages/lex ./packages/lex

# Video service dependencies
COPY ./packages/api ./packages/api
COPY ./packages/common ./packages/common
COPY ./packages/common-web ./packages/common-web
COPY ./packages/crypto ./packages/crypto
COPY ./packages/identity ./packages/identity
COPY ./packages/lex-cli ./packages/lex-cli
COPY ./packages/lexicon ./packages/lexicon
COPY ./packages/repo ./packages/repo
COPY ./packages/sync ./packages/sync
COPY ./packages/syntax ./packages/syntax
COPY ./packages/xrpc-server ./packages/xrpc-server
COPY ./packages/video ./packages/video

COPY ./services/video ./services/video

# install all deps
RUN pnpm install --frozen-lockfile
# build all packages with external node_modules
RUN pnpm run --recursive --stream --filter '@atproto/video...' build
# clean up
RUN rm -rf node_modules
# install only prod deps, hoisted to root node_modules dir
# Set NODE_ENV to skip prepare scripts that install dev dependencies
ENV NODE_ENV=production
RUN pnpm install --prod --shamefully-hoist --frozen-lockfile --prefer-offline

WORKDIR services/video

# Uses assets from build stage to reduce build size
FROM node:20.11-alpine

# Install ffmpeg for video processing
RUN apk add --update dumb-init runit ffmpeg

# Avoid zombie processes, handle signal forwarding
ENTRYPOINT ["dumb-init", "--"]

WORKDIR /app/services/video
COPY --from=build /app /app

EXPOSE 2583
ENV PORT=2583
ENV NODE_ENV=production

# https://github.com/nodejs/docker-node/blob/master/docs/BestPractices.md#non-root-user
USER node
CMD ["node", "--heapsnapshot-signal=SIGUSR2", "--enable-source-maps", "index.js"]

LABEL org.opencontainers.image.source=https://github.com/bluesky-social/atproto
LABEL org.opencontainers.image.description="Video Processing Service"
LABEL org.opencontainers.image.licenses=MIT
