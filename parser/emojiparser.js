import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const savePath = path.join(__dirname, "../emojis.js");

const emojiSourceUrl = "https://unicode.org/Public/emoji/latest/emoji-test.txt";

fetch(emojiSourceUrl)
  .then((response) => response.text())
  .then((data) => {
    const result = processContent(data);

    const output = { groups: result };
    fs.writeFile(
      savePath,
      `const emojis = ${JSON.stringify(output, null, 2)}`,
      (err) => {
        if (err) {
          console.error("Error writing to file:", err);
        } else {
          console.log("File saved successfully.");
        }
      }
    );
  })
  .catch((error) => {
    console.error("Error fetching the file:", error);
  });

function parseEmojiLine(line) {
  const versionRegex = /E\d{1,2}\.\d{1,2}/;
  const [codePoints, fullDescription] = line
    .split(";")
    .map((part) => part.trim());
  const emoji = codePoints
    .split(" ")
    .map((cp) => String.fromCodePoint(parseInt(cp, 16)))
    .join("");

  const versionMatch = line.match(versionRegex);
  let description = "";

  if (versionMatch) {
    const versionNumber = versionMatch[0];
    description = line.split(versionNumber)[1].trim();
  }

  return { codePoints, emoji, description };
}

function processContent(data) {
  const groupRegex = /# group: (.+)/;
  let currentGroup = "Uncategorized";
  const groups = [];

  const groupMap = [];

  const lines = data.split("\n");

  for (let line of lines) {
    if (line.startsWith("# group:")) {
      let groupMatch = groupRegex.exec(line);
      if (groupMatch) {
        currentGroup = groupMatch[1];
        if (!groupMap[currentGroup]) {
          groupMap[currentGroup] = {
            group: currentGroup,
            emojis: [],
          };
          groups.push(groupMap[currentGroup]);
        }
      }
    } else if (
      line.trim() &&
      !line.includes("unqualified") &&
      !line.includes("minimally-qualified") &&
      !line.startsWith("#")
    ) {
      const { emoji, description } = parseEmojiLine(line);

      if (emoji && description) {
        groupMap[currentGroup].emojis.push({ description, emoji });
      }
    }
  }

  // Filter out duplicate emojis
  const filtered = groups.map((group) =>
    group.emojis.reduce(
      (acc, curr) =>
        acc.some((item) => item.icon === curr.icon) ? acc : [...acc, curr],
      []
    )
  );

  return groups;
}
