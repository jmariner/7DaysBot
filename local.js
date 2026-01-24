require("dotenv/config");
const updateDiscordChannel = require("./UpdateDiscordChannel/index");

// Mock Azure Functions context object
const context = {
	log: (...args) => console.log(...args),
	logInfo: (...args) => console.info(...args),
	logWarn: (...args) => console.warn(...args),
	logError: (...args) => console.error(...args),
};

context.log.info = context.logInfo;
context.log.warn = context.logWarn;
context.log.error = context.logError;

// Mock timer object
const myTimer = {
	isPastDue: false,
};

console.log("Starting 7 Days Bot function locally...\n");

// Execute the function
updateDiscordChannel(context, myTimer)
	.then(() => {
		console.log("\n✓ Function completed successfully");
		// Give time for cleanup before exit
		setTimeout(() => process.exit(0), 500);
	})
	.catch((error) => {
		console.error("\n✗ Function failed:", error);
		setTimeout(() => process.exit(1), 500);
	});
