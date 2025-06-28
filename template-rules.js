#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Get command line arguments
const args = process.argv.slice(2);
const watchMode = args.includes('--watch') || args.includes('-w');

// Template functions that can be called from comments
const templateFunctions = {
  listDir: (dirPath) => {
    try {
      const fullPath = path.resolve(dirPath);
      if (!fs.existsSync(fullPath)) {
        return `Directory ${dirPath} does not exist`;
      }
      
      const items = fs.readdirSync(fullPath, { withFileTypes: true });
      const result = items.map(item => {
        if (item.isDirectory()) {
          return `- [dir] ${item.name}/`;
        } else {
          return `- ${item.name}`;
        }
      }).join('\n');
      
      return result || 'Directory is empty';
    } catch (error) {
      return `Error reading directory ${dirPath}: ${error.message}`;
    }
  },
  
  // Add more template functions as needed
  env: () => {
    return `Environment: ${process.platform}`;
  }
};

// Function to safely evaluate function calls from comments
function evaluateTemplateFunction(functionCall) {
  try {
    // Parse the function call to extract function name and arguments
    const match = functionCall.match(/^(\w+)\((.*)\)$/);
    if (!match) {
      return `Invalid function call: ${functionCall}`;
    }
    
    const [, functionName, argsString] = match;
    
    if (!templateFunctions[functionName]) {
      return `Unknown function: ${functionName}`;
    }
    
    // Parse arguments - simple implementation for strings and numbers
    let args = [];
    if (argsString.trim()) {
      // Split by comma, but respect quoted strings
      const argMatches = argsString.match(/([^,]+)/g);
      if (argMatches) {
        args = argMatches.map(arg => {
          arg = arg.trim();
          // Remove quotes if present
          if ((arg.startsWith('"') && arg.endsWith('"')) || 
              (arg.startsWith("'") && arg.endsWith("'"))) {
            return arg.slice(1, -1);
          }
          // Try to parse as number
          if (/^-?\d+\.?\d*$/.test(arg)) {
            return parseFloat(arg);
          }
          return arg;
        });
      }
    }
    
    return templateFunctions[functionName](...args);
  } catch (error) {
    return `Error executing ${functionCall}: ${error.message}`;
  }
}

// Function to process a single file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Find all function call comments with their corresponding end markers
    // Only match comments that contain parentheses (function calls)
    const regex = /<!-- ([^>]*\([^>]*\)[^>]*) -->\s*([\s\S]*?)<!-- end -->/g;
    
    const newContent = content.replace(regex, (match, functionCall, existingContent) => {
      const trimmedCall = functionCall.trim();
      
      const result = evaluateTemplateFunction(trimmedCall);
      const newBlock = `<!-- ${functionCall} -->\n${result}\n<!-- end -->`;
      
      // Only mark as modified if the content actually changed
      if (newBlock !== match) {
        modified = true;
      }
      
      return newBlock;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Processed: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Function to recursively find and process all files in .cursor/rules
function processRulesDirectory(dir = '.cursor/rules') {
  try {
    if (!fs.existsSync(dir)) {
      console.error(`❌ Directory ${dir} does not exist`);
      return;
    }
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    let totalProcessed = 0;
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Recursively process subdirectories
        processRulesDirectory(fullPath);
      } else if (item.isFile()) {
        // Process files (you can add file extension filters here if needed)
        if (processFile(fullPath)) {
          totalProcessed++;
        }
      }
    }
    
    if (totalProcessed > 0) {
      console.log(`\n🎉 Successfully processed ${totalProcessed} files`);
    }
  } catch (error) {
    console.error(`❌ Error processing rules directory: ${error.message}`);
  }
}

// Watch mode function
function watchRulesDirectory(dir = '.cursor/rules') {
  console.log(`👀 Watching ${dir} for changes...\n`);
  
  // Initial processing
  processRulesDirectory(dir);
  
  // Debounce mechanism to prevent infinite loops
  const debounceMap = new Map();
  const DEBOUNCE_TIME = 1000; // 1 second
  
  // Set up file watcher
  try {
    const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (filename && (eventType === 'change' || eventType === 'rename')) {
        const fullPath = path.join(dir, filename);
        
        // Check if file still exists (in case of deletion)
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          // Debounce file changes to prevent infinite loops
          const now = Date.now();
          const lastProcessed = debounceMap.get(fullPath) || 0;
          
          if (now - lastProcessed > DEBOUNCE_TIME) {
            console.log(`\n📝 File changed: ${filename}`);
            console.log('🔄 Re-templating...');
            
            // Store the time before processing to prevent loops from our own writes
            debounceMap.set(fullPath, now);
            processFile(fullPath);
          }
        }
      }
    });
    
    console.log('\n✨ File watcher active. Press Ctrl+C to stop.\n');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping file watcher...');
      watcher.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error(`❌ Error setting up file watcher: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
if (watchMode) {
  console.log('🚀 Starting rule file templating in WATCH mode...\n');
  watchRulesDirectory();
} else {
  console.log('🚀 Starting rule file templating...\n');
  processRulesDirectory();
} 