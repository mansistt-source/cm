# Content Machine — Claude + Higgsfield MCP

AI-powered video content pipeline for businesses.
Orchestrated by **Claude (Anthropic)** via **Higgsfield MCP Server**.

---

## Architecture

```
User Prompt
    │
    ▼
Claude (Storyboard)          ← claude-sonnet-4-20250514
    │
    ▼
Claude + fal.ai (Frames)     ← MCP: generate_scene_frames
    │  End frame N = Start frame N+1 (continuity guaranteed)
    ▼
Claude + Higgsfield (Video)  ← MCP: generate_video_clip
    │
    ▼
FFmpeg (Montage)             ← assembleMontage()
    │
    ▼
Claude (Caption + Hashtags)  ← claude-sonnet-4-20250514
    │
    ▼
Instagram / TikTok / YouTube ← Meta Graph API / TikTok API / YouTube API
```

---

## Setup

### 1. Environment Variables

```env
# Core
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...

# Video Generation
HIGGSFIELD_API_KEY=...
FAL_API_KEY=...

# Social Publishing
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
```

### 2. Install Dependencies

```bash
pnpm install

# Install MCP server dependencies
cd mcp-higgsfield && npm install && cd ..
```

### 3. Database

```bash
pnpm db:push
```

### 4. Run

```bash
# Development
pnpm dev

# MCP Server (separate terminal — for Claude Code / external use)
cd mcp-higgsfield && npm start
```

---

## MCP Server (Higgsfield)

The `mcp-higgsfield/` directory is a standalone MCP server.

### Available Tools

| Tool | Description |
|------|-------------|
| `generate_scene_frames` | Generate start + end keyframes (fal.ai Flux) |
| `generate_video_clip` | Generate video clip with frame continuity (Higgsfield) |
| `poll_clip_status` | Poll generation status |
| `generate_all_clips` | Generate all scenes in parallel |

### Connect to Claude Code

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "higgsfield": {
      "command": "node",
      "args": ["/path/to/content-machine/mcp-higgsfield/index.js"],
      "env": {
        "HIGGSFIELD_API_KEY": "your-key",
        "FAL_API_KEY": "your-key"
      }
    }
  }
}
```

---

## Pricing Model (B2B)

| Tier | Setup | Monthly | Videos/month |
|------|-------|---------|-------------|
| Starter | 150 OMR | 40 OMR | 4 |
| Growth | 200 OMR | 70 OMR | 8 |
| Enterprise | Custom | Custom | Unlimited |

### Cost per video (4 scenes × 5s)

| Component | Cost |
|-----------|------|
| Claude API (storyboard + caption) | ~$0.02 |
| fal.ai Flux (8 frames) | ~$0.04 |
| Higgsfield (4 clips) | ~$1.50 |
| FFmpeg montage | Free |
| **Total** | **~$1.56** |

**Margin at 40 OMR/month (4 videos): ~93%**

---

## Files Changed from Original

| File | Change |
|------|--------|
| `server/_core/llm.claude.ts` | New — Claude API replaces Gemini |
| `server/services/higgsfield.claude.ts` | New — Claude + MCP orchestration |
| `mcp-higgsfield/index.ts` | New — Standalone MCP Server |

To activate, rename:
```bash
mv server/_core/llm.ts server/_core/llm.gemini.ts
mv server/_core/llm.claude.ts server/_core/llm.ts

mv server/services/higgsfield.ts server/services/higgsfield.manus.ts
mv server/services/higgsfield.claude.ts server/services/higgsfield.ts
```
