FROM oven/bun:1.1-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=http://13.140.158.252:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]