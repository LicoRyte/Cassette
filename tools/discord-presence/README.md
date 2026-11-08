# Discord status for Solarist

Shows what you're doing in Solarist on your Discord profile, for example:

> **Studying · Exploring**
> At Netue IV · Ocean world

Browsers can't talk to the Discord app, so `solarist_presence.py` runs on your computer and passes the status along.
It's off until you turn it on in Solarist, and it only accepts updates from Solarist itself
(https://licoryte.github.io, or your own copy on `localhost`), so no other website can change your status.

## One-time setup

1. Go to https://discord.com/developers/applications, click **New Application**, and name it **Solarist**.
   Discord shows this name as "Playing Solarist".
2. On the application's **General Information** page, copy the **Application ID** (a long number).
3. Make a file called `client_id.txt` in this folder and paste the ID into it.
   (Or skip the file and pass it each time: `--client-id 123...`.)

You need Python 3.8 or newer. Nothing else to install.

## Every time

1. Have the Discord desktop app open.
2. Start the helper:

   ```
   python solarist_presence.py
   ```

   Use `pythonw` instead of `python` to run it without a console window.
3. In Solarist, open **Settings** and turn on **Discord status**. The line under the button tells you whether it found
   the helper and Discord. If your browser asks to let Solarist reach devices on your network, allow it: that's how
   the page reaches the helper on your own computer.

The status clears itself when you close Solarist, or after a couple of minutes without news (for example if your
computer sleeps). Stop the helper with Ctrl+C, or by closing its window.

## Notes

- It listens on `127.0.0.1:6473` (your computer only). Change it with `--port`, but Solarist always uses 6473.
- "Invalid Client ID" in Settings means the ID in `client_id.txt` is wrong.
- Discord needs "Share your detected activities with others" turned on (Discord settings, Activity Privacy) for friends to see it.
