const { Telnet } = require("telnet-client");

module.exports = async function (context, myTimer) {
	function logDebug(...args) {
		if (process.env.DEBUG === "true") {
			context.log("[DEBUG]", ...args);
		}
	}

	const timeStamp = new Date().toISOString();

	if (myTimer.isPastDue) {
		context.log("Timer function is running late!");
	}

	context.log("7 Days Bot timer trigger function started at", timeStamp);

	const conn = new Telnet();

	const data = {
		players: null,
		maxPlayers: null,
		day: null,
		time: null,
	};

	async function tryHandleData() {
		for (const value of Object.values(data)) {
			if (value === null) {
				logDebug("Data incomplete, waiting for more...", data);
				return false;
			}
		}

		const { players, maxPlayers, day, time } = data;
		context.log(`Players Online: ${players}/${maxPlayers}`);
		context.log(`In-game time: Day ${day}, ${time}`);

		const { DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID } = process.env;

		try {
			const response = await fetch(
				`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						topic: `Players: ${players}/${maxPlayers} | Day ${day}, ${time}`,
					}),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				context.log.error(
					`Failed to update channel topic: ${response.status} ${errorText}`,
				);
				return false;
			}

			context.log("Channel topic updated successfully.");
			return true;
		} catch (error) {
			context.log.error("Error updating Discord channel:", error);
			return false;
		}
	}

	const params = {
		host: process.env.TELNET_HOST,
		port: process.env.TELNET_PORT,
		timeout: 5_000,
		username: "",
		password: process.env.TELNET_PASSWORD,
		passwordPrompt: /Please enter password:/i,
		negotiationMandatory: false,
		debug: false,
	};

	return new Promise((resolve, reject) => {
		let resolved = false;
		const timeoutId = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				context.log.warn("Function timeout - cleaning up");
				resolve();
			}
		}, 50_000); // 50 second timeout to allow function to complete

		conn.on("data", (_data) => {
			if (resolved) return; // Ignore data after completion

			/** @type {string} */
			const str = _data.toString();
			logDebug("Received data:", str);

			const maxPlayersMatch = str.match(/Max players: (\d+)/);
			if (maxPlayersMatch) {
				data.maxPlayers = parseInt(maxPlayersMatch[1], 10);
				logDebug("Got max players:", data.maxPlayers);
			}

			const timeMatch = str.match(/Day (\d+), (\d\d?:\d\d)/);
			if (timeMatch) {
				data.day = timeMatch[1];
				data.time = timeMatch[2];
				logDebug("Got in-game time:", `Day ${data.day}, ${data.time}`);
			}

			const lpMatch = str.match(/Total of (\d+) in the game/);
			if (lpMatch) {
				data.players = lpMatch[1];
				logDebug("Got players online:", data.players);
			}

			if (str.includes("Press 'help' to get a list of all commands.")) {
				conn.send("gt");
				conn.send("lp");
				logDebug("Sent 'gt' and 'lp' commands.");
			}

			tryHandleData()
				.then((success) => {
					if (success && !resolved) {
						resolved = true;
						clearTimeout(timeoutId);
						resolve();
					}
				})
				.catch((error) => {
					if (!resolved) {
						resolved = true;
						clearTimeout(timeoutId);
						context.log.error("Error in tryHandleData:", error);
						reject(error);
					}
				});
		});

		conn.on("ready", () => {
			if (resolved) return;
			logDebug("Telnet connection established.");
		});

		conn.on("failedlogin", () => {
			context.log.error("Telnet login failed.");
			if (!resolved) {
				resolved = true;
				clearTimeout(timeoutId);
				reject(new Error("Telnet login failed"));
			}
		});

		conn.on("timeout", () => {
			context.log.error("Telnet connection timed out.");
			if (!resolved) {
				resolved = true;
				clearTimeout(timeoutId);
				reject(new Error("Telnet connection timed out"));
			}
		});

		conn.on("close", () => {
			logDebug("Telnet connection closed.");
			if (!resolved) {
				resolved = true;
				clearTimeout(timeoutId);
				resolve();
			}
		});

		conn.on("error", (error) => {
			if (error.message.includes("ECONNREFUSED")) {
				context.log.error(
					"Telnet connection refused. Is the server online and is the Telnet port correct?",
				);
			} else {
				context.log.error("Telnet connection error:", error);
			}
			if (!resolved) {
				resolved = true;
				clearTimeout(timeoutId);
				reject(error);
			}
		});

		conn.connect(params);
	});
};
