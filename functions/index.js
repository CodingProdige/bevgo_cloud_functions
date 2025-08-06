const fs = require("fs");
const path = require("path");

const functions = {};

const routeFiles = fs.readdirSync(path.join(__dirname, "routes"));

for (const file of routeFiles) {
  if (file.endsWith(".js")) {
    const routeName = path.basename(file, ".js");
    functions[routeName] = require(`./routes/${file}`)[routeName];
  }
}

module.exports = functions;
