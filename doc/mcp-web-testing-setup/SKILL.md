---
name: mcp-web-testing-setup
description: Setup and configure MCP (Model Context Protocol) servers for web testing, specifically Puppeteer and Chrome DevTools MCP servers. Use when user wants to install, configure, or verify MCP web testing tools. This skill handles the complete setup process including installation, configuration, and validation of these MCP servers for browser automation and web testing tasks.
---

# MCP Web Testing Setup

## Overview

This skill sets up MCP servers for web testing and browser automation. It configures Puppeteer MCP and Chrome DevTools MCP servers, enabling browser automation, screenshot capture, form interaction, and performance metrics collection.

## Quick Setup

To install both MCP servers for web testing, run these commands:

```bash
# Install Puppeteer MCP server (user-wide installation)
claude mcp add -s user puppeteer -- npx -y @modelcontextprotocol/server-puppeteer

# Install Chrome DevTools MCP server (user-wide installation)
claude mcp add -s user chrome-devtools -- npx -y chrome-devtools-mcp@latest

# Verify installation
claude mcp list
```

## Installation Steps

### Step 1: Check Current MCP Status

Before installation, check if MCP servers are already configured:

```bash
claude mcp list
```

Expected output for new installation:
```
No MCP servers configured. Use `claude mcp add` to add a server.
```

### Step 2: Install Puppeteer MCP Server

Puppeteer MCP provides browser automation capabilities including navigation, clicking, form filling, and screenshots.

```bash
claude mcp add -s user puppeteer -- npx -y @modelcontextprotocol/server-puppeteer
```

**What this does:**
- Adds Puppeteer MCP server to user configuration (~/.claude.json)
- Server command: npx -y @modelcontextprotocol/server-puppeteer
- Transport type: stdio

### Step 3: Install Chrome DevTools MCP Server

Chrome DevTools MCP provides low-level browser debugging and performance metrics.

```bash
claude mcp add -s user chrome-devtools -- npx -y chrome-devtools-mcp@latest
```

**What this does:**
- Adds Chrome DevTools MCP server to user configuration (~/.claude.json)
- Server command: npx -y chrome-devtools-mcp@latest
- Transport type: stdio

### Step 4: Verify Configuration

Confirm both servers are installed and connected:

```bash
claude mcp list
```

Expected output:
```
Checking MCP server health...

puppeteer: npx -y @modelcontextprotocol/server-puppeteer - Connected
chrome-devtools: npx -y chrome-devtools-mcp@latest - Connected
```

## MCP Server Options

### Configuration Scopes

Use -s flag to specify installation scope:

- **user** (-s user): Global installation, available for all projects
- **project** (-s project): Project-specific installation
- **local** (default): Current working directory only

**Recommendation:** Use -s user for web testing MCP servers to make them available across all projects.

### Adding Environment Variables

If a MCP server requires environment variables (like API keys):

```bash
claude mcp add -s user my-server -- npx -y @some/mcp-server -e API_KEY=your-key -e SECRET=value
```

### Transport Types

The -- separator separates claude mcp add options from the server command:

- **stdio** (default): Standard input/output communication
- **http** (--transport http): HTTP-based communication
- **sse** (--transport sse): Server-Sent Events

## Available Tools

After installation, these MCP tools become available:

### Puppeteer MCP Tools (38 tools)

**Navigation:**
- mcp__puppeteer__navigate - Navigate to URL
- mcp__puppeteer__go_back - Browser back navigation
- mcp__puppeteer__go_forward - Browser forward navigation
- mcp__puppeteer__reload - Reload page

**Interaction:**
- mcp__puppeteer__click - Click element
- mcp__puppeteer__fill - Fill form fields
- mcp__puppeteer__select - Select dropdown options
- mcp__puppeteer__hover - Hover over elements
- mcp__puppeteer__type_text - Type text
- mcp__puppeteer__upload_file - Upload file

**Screenshot:**
- mcp__puppeteer__screenshot - Take screenshot

**JavaScript:**
- mcp__puppeteer__evaluate - Execute JavaScript

**Verification:**
- mcp__puppeteer__wait_for - Wait for element/condition
- mcp__puppeteer__console_messages - Get console logs
- mcp__puppeteer__network_requests - Get network requests

### Chrome DevTools MCP Tools (3 tools)

- mcp__chrome_devtools__tabs - Get tab list
- mcp__chrome_devtools__send_command - Send DevTools command
- mcp__chrome_devtools__get_metrics - Get performance metrics

## Managing MCP Servers

### List Installed Servers

```bash
claude mcp list
```

### Remove a MCP Server

```bash
claude mcp remove puppeteer
claude mcp remove chrome-devtools
```

### Update a MCP Server

To update to latest version, remove and re-add:

```bash
claude mcp remove chrome-devtools
claude mcp add -s user chrome-devtools -- npx -y chrome-devtools-mcp@latest
```

### Get Help

```bash
claude mcp add --help
claude mcp --help
```

## Troubleshooting

### Server Not Connecting

If claude mcp list shows server as disconnected:

1. Check if npx is available: npx --version
2. Try installing the package manually: npx -y @modelcontextprotocol/server-puppeteer
3. Check for errors in terminal output
4. Restart Claude Code CLI

### Permission Denied Errors

On Windows, run terminal as Administrator if permission errors occur.

### Command Not Found

Ensure you're using the correct scope flag:
- Use -- to separate claude options from server command
- Don't put flags like -y before --

**Correct:**
```bash
claude mcp add -s user puppeteer -- npx -y @modelcontextprotocol/server-puppeteer
```

**Incorrect:**
```bash
claude mcp add -s user puppeteer npx -y @modelcontextprotocol/server-puppeteer
```

## Configuration File

MCP servers are stored in ~/.claude.json under the mcpServers section:

{
  "mcpServers": {
    "puppeteer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
      "env": {}
    },
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"],
      "env": {}
    }
  }
}

## Use Cases

### Web Functional Testing
- Login flow testing
- Form validation testing
- Navigation testing

### Visual Regression Testing
- Screenshot capture
- Page rendering verification
- Responsive layout testing

### Performance Testing
- Page load metrics
- Network request analysis
- JavaScript execution timing

### Browser Automation
- Automated data entry
- Batch form submissions
- Web scraping

## Next Steps

After installation, these tools are immediately available to the web-tester agent for browser automation and web testing tasks. No additional configuration is needed.
