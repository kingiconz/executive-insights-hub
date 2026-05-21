# Use the official Bun image
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
# We set NODE_ENV to production for the build
ENV NODE_ENV=production
RUN bun run build

# Final stage
FROM oven/bun:1-slim
WORKDIR /app

# Copy the build output and necessary files
COPY --from=base /app/.output ./.output
COPY --from=base /app/package.json ./

# Expose the port the app runs on
EXPOSE 3000

# Start the application
# TanStack Start with Vinxi usually outputs to .output/server/index.mjs
CMD ["bun", ".output/server/index.mjs"]
