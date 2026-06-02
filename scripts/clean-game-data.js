const fs = require('fs');
const path = require('path');

// Read the game.json file
const filePath = path.join(__dirname, '..', 'game.json');
const fileContent = fs.readFileSync(filePath, 'utf8');

try {
  // Parse JSON to check if it's valid
  const gameData = JSON.parse(fileContent);
  
  console.log(`Loaded ${gameData.length} games for cleaning.`);
  
  // Cleaning and saving...
  
  // Cleaning function: Replace common encoding errors
  function cleanText(text) {
    if (!text) return text;
    
    // Check if text contains characters that could cause regex errors
    const hasRegexIssue = /(?<!\\)\/(?![^\/]*\/)/.test(text); // Check for unclosed forward slashes
    
    let cleanedText = text;
    
    // Replace common encoding errors in apostrophes and quotes
    cleanedText = cleanedText
      .replace(/'/g, "'")
      .replace(/'/g, "'")
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/—/g, '-')
      .replace(/–/g, '-');
    
    // Fix other potential encoding issues
    cleanedText = cleanedText
      .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // Replace invalid Unicode characters
      .replace(/[\u0080-\u009F]/g, '') // Replace control characters
      .replace(/\\+(?![bnrt'"\\/])/g, '\\'); // Fix incorrect escape sequences
    
    // Additional handling for regex-related issues
    if (hasRegexIssue) {
      // Escape all unescaped forward slashes, or replace with other characters
      cleanedText = cleanedText.replace(/(?<!\\)\//g, '\\/');
    }
    
    // Handle mismatched regex delimiters
    cleanedText = cleanedText.replace(/(?<!\\)\/(?![^\/]*\/)/g, '\\\/');
    
    return cleanedText;
  }
  
  // Check the entire JSON string for potential issues
  function diagnosePotentialIssues(data) {
    // Convert the entire JSON to a string for checking
    const jsonString = JSON.stringify(data);
    
    // Check for various patterns that could cause problems
    const patterns = [
      { pattern: /(?<!\\)\//g, name: "Unescaped forward slash" },
      { pattern: /[\uFFFD\uFFFE\uFFFF]/g, name: "Invalid Unicode character" },
      { pattern: /[\u0080-\u009F]/g, name: "Control character" },
      { pattern: /\\+(?![bnrt'"\\/])/g, name: "Incorrect escape sequence" },
      { pattern: /'/g, name: "Curly apostrophe" },
      { pattern: /"/g, name: "Curly quote" },
      { pattern: /—/g, name: "Em dash" },
      { pattern: /–/g, name: "En dash" }
    ];
    
    patterns.forEach(p => {
      const matches = jsonString.match(p.pattern);
      if (matches && matches.length > 0) {
        console.log(`Found ${matches.length} instances of ${p.name}`);
        
        // Print some context for matches
        if (matches.length < 10) {
          matches.forEach(match => {
            const index = jsonString.indexOf(match);
            const start = Math.max(0, index - 20);
            const end = Math.min(jsonString.length, index + match.length + 20);
            const context = jsonString.substring(start, end);
            console.log(`Context: ...${context}...`);
          });
        }
      }
    });
  }
  
  // First check the entire dataset for potential issues
  diagnosePotentialIssues(gameData);
  
  let modifiedCount = 0;
  
  // Process game data
  const cleanedGameData = gameData.map(game => {
    const cleanedGame = { ...game };
    
    // Clean all text fields
    cleanedGame.title = cleanText(game.title);
    cleanedGame.description = cleanText(game.description);
    cleanedGame.tags = cleanText(game.tags);
    
    // Check if there were changes
    if (
      cleanedGame.title !== game.title ||
      cleanedGame.description !== game.description ||
      cleanedGame.tags !== game.tags
    ) {
      modifiedCount++;
    }
    
    return cleanedGame;
  });
  
  // Check the cleaned data again
  diagnosePotentialIssues(cleanedGameData);
  
  // Save the fixed data
  fs.writeFileSync(filePath, JSON.stringify(cleanedGameData, null, 2));
  
  console.log(`Cleaning complete. Modified ${modifiedCount} games.`);
} catch (error) {
  console.error('Error processing game data:', error);
} 