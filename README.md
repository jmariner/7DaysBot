# 7 Days Bot - Azure Function

Azure Function that monitors a 7 Days to Die game server via Telnet and updates a Discord channel topic with the current server status.

## Features

- **Timer Trigger**: Runs every minute to update server status
- **Telnet Connection**: Connects to game server to retrieve player count and in-game time
- **Discord Integration**: Updates Discord channel topic with latest server information

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
- 7 Days to Die server with Telnet enabled
- Discord Bot with channel management permissions

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `local.settings.json`:
   - `TELNET_HOST`: Your game server hostname/IP
   - `TELNET_PORT`: Telnet port (usually 8081)
   - `TELNET_PASSWORD`: Telnet password
   - `DISCORD_BOT_TOKEN`: Your Discord bot token
   - `DISCORD_CHANNEL_ID`: Discord channel ID to update
   - `DEBUG`: Set to "true" for debug logging

3. Run locally with Azure Functions runtime:
   ```bash
   npm start
   ```

4. Or run once without Azure Functions (useful for testing):
   ```bash
   npm run local
   ```
   This uses `local.js` which loads settings from `.env` file instead of `local.settings.json`.

### Deployment to Azure

1. Create an Azure Function App (Node.js runtime)

2. Configure Application Settings with the same environment variables as `local.settings.json`

3. Deploy using Azure Functions Core Tools:
   ```bash
   func azure functionapp publish <YOUR_FUNCTION_APP_NAME>
   ```

## Timer Schedule

The function runs every minute (CRON: `0 * * * * *`). To change the schedule, edit the `schedule` property in [UpdateDiscordChannel/function.json](UpdateDiscordChannel/function.json).

CRON format: `{second} {minute} {hour} {day} {month} {day of week}`

Examples:
- Every minute: `0 * * * * *`
- Every 5 minutes: `0 */5 * * * *`
- Every hour: `0 0 * * * *`

## Project Structure

```
├── UpdateDiscordChannel/       # Timer trigger function
│   ├── function.json          # Function binding configuration
│   └── index.js               # Function code
├── host.json                  # Global function app settings
├── local.settings.json        # Local environment variables (for Azure Functions)
├── .env                       # Environment variables (for local.js)
├── local.js                   # Standalone runner without Azure Functions
├── package.json               # Dependencies
└── README.md                  # This file
```

## Monitoring

View function execution logs:
- **Locally**: Check terminal output
- **Azure**: Use Application Insights or Stream logs in Azure Portal
