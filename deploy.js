/*
  Local deployment helper for PlayArcadeX.
  This script intentionally keeps checks enabled so deployment matches production quality.
*/

const { spawn } = require("child_process");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      ...options,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function main() {
  try {
    console.log("1/3 Installing dependencies...");
    await run("npm", ["install"]);

    console.log("2/3 Running lint...");
    await run("npm", ["run", "lint"]);

    console.log("3/3 Building app...");
    await run("npm", ["run", "build"]);

    console.log("Build pipeline completed successfully. You can deploy to Vercel now.");
  } catch (error) {
    console.error("Deployment preparation failed:", error.message);
    process.exit(1);
  }
}

main();
