# vela

An open-source AI chatbot platform with RAG (Retrieval-Augmented Generation) capabilities. Build, customize, and deploy AI agents with your own knowledge base.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)

## ✨ Features

- **Multiple AI Agents** - Create and manage multiple AI assistants with different configurations
- **Knowledge Base** - Upload documents (PDF, DOCX, TXT), add text content, or create Q&A pairs
- **RAG Pipeline** - Automatic chunking, embedding generation, and vector search for context-aware responses
- **Customizable Widget** - Embed a chat widget on any website with customizable appearance
- **Multi-Model Support** - Works with OpenAI, Anthropic Claude, and local models via Ollama
- **Team Collaboration** - Invite team members to collaborate on your agents
- **Usage Tracking** - Built-in usage metering with plan-based limits
- **Self-Hosted Ready** - Deploy on your own infrastructure with Docker

## 🏗️ Architecture

```
vela/
├── apps/
│   ├── api/          # Hono.js API server
│   ├── dashboard/    # Next.js admin dashboard
│   └── widget/       # Embeddable chat widget (Vite)
├── packages/
│   ├── db/           # Drizzle ORM schema & migrations
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared UI components
```

## 🚀 Quick Start

### Option 1: Docker (Recommended for Self-Hosting)

```bash
# Clone the repository
git clone https://github.com/your-org/vela.git
cd vela

# Copy environment file and generate a secure secret
cp .env.example .env
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env

# Start all services
docker compose up -d

# Enable pgvector extension and run database migrations
docker exec vela-postgres-1 psql -U postgres -d vela -c "CREATE EXTENSION IF NOT EXISTS vector;"
cd packages/db && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/vela" pnpm drizzle-kit push && cd ../..

# Restart the API to apply changes
docker compose restart api

# Pull the Ollama models
docker compose exec ollama ollama pull qwen2.5:7b        # Chat model (best for tool support)
docker compose exec ollama ollama pull mxbai-embed-large # Embedding model for RAG
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

### Option 2: Local Development

**Prerequisites:**
- Node.js >= 20
- pnpm >= 9
- PostgreSQL with pgvector extension (or use Docker for just Postgres)
- Ollama (optional, for local LLM)

```bash
# Clone the repository
git clone https://github.com/your-org/vela.git
cd vela

# Install dependencies
pnpm install

# Start PostgreSQL with pgvector (using Docker)
docker compose up postgres -d

# Enable pgvector extension
docker exec vela-postgres-1 psql -U postgres -d vela -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Copy and configure environment (single .env file in root)
cp .env.example .env
# Edit .env - update DATABASE_URL to use localhost:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vela

# Generate a secure auth secret
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env

# Run database migrations
cd packages/db && pnpm drizzle-kit push && cd ../..

# (Optional) Start Ollama for local LLM
ollama serve &
ollama pull llama3.1:8b       # Chat model
ollama pull nomic-embed-text  # Embedding model for RAG

# Start all development servers with a single command
pnpm dev
```

This starts all services using the single `.env` file from the root directory:
- **API** at [http://localhost:3001](http://localhost:3001)
- **Dashboard** at [http://localhost:3000](http://localhost:3000)
- **Widget** at [http://localhost:3002](http://localhost:3002)

### Setting up Ollama for Local Models

To use local LLM models instead of cloud APIs, you need Ollama running:

**Option A: Install Ollama natively (recommended for development)**
```bash
# macOS
brew install ollama

# Start Ollama server
ollama serve

# In another terminal, pull the required models
ollama pull qwen2.5:7b        # Chat model (best for tool support)
ollama pull mxbai-embed-large # Embedding model for RAG (1024 dimensions)
```

**Option B: Use Docker**
```bash
# Start Ollama container
docker compose up ollama -d

# Pull the required models
docker compose exec ollama ollama pull qwen2.5:7b
docker compose exec ollama ollama pull mxbai-embed-large
```

**Required Models:**

| Model | Purpose | Size |
|-------|---------|------|
| `qwen2.5:7b` | Chat/completion (recommended) | ~4.7GB |
| `mxbai-embed-large` | Embeddings for RAG (1024 dim) | ~670MB |

> **Note:** `qwen2.5:7b` is recommended as it has the best support for tool/function calling among local models. The embedding model is optional - if not installed, chat will work but without RAG context from your documents.

Once Ollama is running, local models will automatically appear in the model dropdown on the Agents page.

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SELF_HOSTED` | Disable billing/usage limits | `true` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `BETTER_AUTH_SECRET` | Auth session secret | - |
| `ANTHROPIC_API_KEY` | Anthropic API key (optional) | - |
| `OPENAI_API_KEY` | OpenAI API key (optional) | - |
| `OPENAI_API_BASE` | OpenAI-compatible API base URL | - |
| `VOYAGE_API_KEY` | Voyage AI for embeddings (optional) | - |
| `DASHBOARD_URL` | Dashboard URL for CORS | `http://localhost:3000` |

### LLM Providers

**Ollama (Local, Free)**
```env
OPENAI_API_BASE=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen2.5:7b
```

**OpenAI**
```env
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o
```

**Anthropic Claude**
```env
ANTHROPIC_API_KEY=sk-ant-your-key
```

## 📖 API Documentation

API documentation is available at `/api/docs` when running the API server.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat` | Send a message to an agent |
| `GET` | `/agents` | List all agents |
| `POST` | `/agents` | Create a new agent |
| `POST` | `/documents` | Upload a document |
| `GET` | `/conversations` | List conversations |

## 🎨 Widget Integration

Embed the chat widget on any website:

```html
<script>
  window.velaConfig = {
    agentId: "your-agent-id",
    apiUrl: "https://your-api-url.com"
  };
</script>
<script src="https://your-widget-url.com/widget.js" async></script>
```

## 🛠️ Development

```bash
# Run all apps in development mode
pnpm dev

# Run tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint

# Build all packages
pnpm build
```

### Database Migrations

```bash
cd packages/db

# Generate migration
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit push

# Open Drizzle Studio
pnpm drizzle-kit studio
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

For security concerns, please see [SECURITY.md](SECURITY.md) or email security@yourdomain.com.
