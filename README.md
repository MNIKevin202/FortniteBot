# FortniteBot

A Discord bot that reads Fortnite Battle Royale data from [fortnite-api.com](https://fortnite-api.com/) and is ready to deploy on CapRover.

## Commands

- `/shop` shows current Battle Royale item shop items.
- `/news` shows current Battle Royale news posts.
- `/stats name platform` shows lifetime Battle Royale stats. This requires a Fortnite API key.

## Local Setup

1. Create a Discord application at [discord.com/developers/applications](https://discord.com/developers/applications).
2. Open **Bot**, create/reset the bot token, and copy it.
3. Open **OAuth2 > General**, copy the application/client ID.
4. Invite the bot to your server from **OAuth2 > URL Generator** with:
   - Scope: `bot`
   - Scope: `applications.commands`
   - Bot permission: `Send Messages`
5. Create a Fortnite API key from the Fortnite API dashboard if you want `/stats`.

Then create your local `.env`:

```bash
cp .env.example .env
```

Fill in:

```bash
DISCORD_APPLICATION_ID=...
DISCORD_PUBLIC_KEY=...
DISCORD_SECRET=...
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
DISCORD_PREFIX=!
DISCORD_PREFIX_ENABLED=false
mongoDB_URI=...
admin_role_ID=...
mod_role_ID=...
member_role_ID=...
FORTNITE_API_KEY=...
```

`DISCORD_GUILD_ID` is optional, but useful during development because guild commands update almost instantly.
`FORTNITE_API_KEY` is only required for `/stats`; `/shop` and `/news` work without it.

## Run It

Register slash commands manually if you want to do it before starting the bot:

```bash
npm run register
```

Start the bot:

```bash
npm start
```

When the terminal says `Logged in as ...`, try `/shop`, `/news`, or `/stats` in Discord.
The bot also registers slash commands automatically on startup, which is useful for CapRover deploys.

## CapRover

This repo includes:

- `captain-definition`
- `Dockerfile`
- HTTP health server on port `60894`

In CapRover, set the container HTTP port to:

```text
60894
```

Add these CapRover environment variables:

```bash
DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=
DISCORD_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
DISCORD_PREFIX=!
DISCORD_PREFIX_ENABLED=false
mongoDB_URI=
admin_role_ID=
mod_role_ID=
member_role_ID=
FORTNITE_API_KEY=
```

The app responds at `/health` so CapRover has a normal HTTP process to route to.

## Notes

- Keep `.env` private. Never commit your Discord token or API key.
- Global slash commands can take a while to appear. Use `DISCORD_GUILD_ID` while developing.
- Shop/news are good first commands because they do not require a player account lookup flow.
- Prefix commands require enabling the Discord Message Content privileged intent in the Developer Portal. Slash commands do not.
