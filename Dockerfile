# Use the official Bun image
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
ENV NODE_ENV=production
RUN bun run build

# Final stage
FROM oven/bun:1-slim
WORKDIR /app

# Copy the build output and necessary files
COPY --from=base /app/.output ./.output
COPY --from=base /app/package.json ./

# Expose the port the app runs on
ENV PORT=3000
EXPOSE 3000

# Start the application
# We use bun run start which points to the correct entry point
CMD ["bun", "run", "start"]
