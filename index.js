require("dotenv/config");
const { Telnet } = require("telnet-client");
const conn = new Telnet();

function logDebug(...args) {
	if (process.env.DEBUG) {
		console.debug("[DEBUG]", ...args);
	}
}

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
			return;
		}
	}

	const { players, maxPlayers, day, time } = data;
	console.log(`Players Online: ${players}/${maxPlayers}`);
	console.log(`In-game time: Day ${day}, ${time}`);

	const { DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID } = process.env;

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
		console.error(
			`Failed to update channel topic: ${response.status} ${errorText}`,
		);
		conn.destroy();
		setTimeout(() => process.exit(1), 100);
		return;
	}

	console.log("Channel topic updated successfully.");

	conn.destroy();
	setTimeout(() => process.exit(0), 100);
}

const params = {
	host: process.env.TELNET_HOST,
	port: process.env.TELNET_PORT,
	timeout: 5_000,
	username: "",
	password: process.env.TELNET_PASSWORD,
	passwordPrompt: /Please enter password:/i,

	// shellPrompt: /\r\n$/,
	negotiationMandatory: false,
	debug: false,
};

conn.on("data", (_data) => {
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

	tryHandleData().catch(console.error);
});

conn.on("ready", () => {
	logDebug("Telnet connection established.");
});

conn.on("failedlogin", () => {
	logDebug("Telnet login failed.");
});

conn.on("timeout", () => {
	logDebug("Telnet connection timed out.");
	process.exit(1);
});

conn.on("close", () => {
	logDebug("Telnet connection closed.");
});

conn.on("error", (error) => {
	if (error.message.includes("ECONNREFUSED")) {
		console.error(
			"Telnet connection refused. Is the server online and is the Telnet port correct?",
		);
	} else {
		console.error("Telnet connection error:", error);
	}
	process.exit(1);
});

conn.connect(params);
