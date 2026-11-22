FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --allow-build=bcrypt --allow-build=@parcel/watcher --allow-build=@scarf/scarf

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["node", "dist/main"]