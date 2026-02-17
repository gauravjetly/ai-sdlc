import * as fs from 'fs';
import * as path from 'path';

/**
 * Documentation Generator
 * Auto-generates markdown docs from TypeScript code
 */

export async function generateDocsCommand(args: string[]): Promise<void> {
  const targetPath = args[0] || 'src/';

  console.log(`\n  Generating documentation for: ${targetPath}\n`);

  const files = findTypeScriptFiles(targetPath);
  const docsDir = 'docs/api/';

  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  let generatedCount = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const docs = generateDocumentation(content, file);

    if (docs) {
      const docFile = path.join(
        docsDir,
        path.basename(file, path.extname(file)) + '.md'
      );
      fs.writeFileSync(docFile, docs);
      generatedCount++;
    }
  }

  console.log(`  ✅ Generated documentation for ${generatedCount} files`);
  console.log(`  📁 Output directory: ${docsDir}\n`);
}

function generateDocumentation(content: string, filePath: string): string | null {
  const fileName = path.basename(filePath, path.extname(filePath));

  let doc = `# ${fileName}\n\n`;

  // Extract module description
  const moduleDesc = extractModuleDescription(content);
  if (moduleDesc) {
    doc += `${moduleDesc}\n\n`;
  }

  // Extract classes
  const classes = extractClasses(content);
  if (classes.length > 0) {
    doc += `## Classes\n\n`;
    classes.forEach(cls => {
      doc += `### ${cls.name}\n\n`;
      if (cls.description) {
        doc += `${cls.description}\n\n`;
      }

      if (cls.methods.length > 0) {
        doc += `#### Methods\n\n`;
        cls.methods.forEach(method => {
          doc += `##### \`${method.name}(${method.params.join(', ')})\`\n\n`;
          if (method.description) {
            doc += `${method.description}\n\n`;
          }
          if (method.returns) {
            doc += `**Returns:** ${method.returns}\n\n`;
          }
        });
      }
    });
  }

  // Extract functions
  const functions = extractFunctions(content);
  if (functions.length > 0) {
    doc += `## Functions\n\n`;
    functions.forEach(func => {
      doc += `### \`${func.name}(${func.params.join(', ')})\`\n\n`;
      if (func.description) {
        doc += `${func.description}\n\n`;
      }
      if (func.returns) {
        doc += `**Returns:** ${func.returns}\n\n`;
      }
    });
  }

  return doc.length > fileName.length + 10 ? doc : null;
}

function extractModuleDescription(content: string): string | null {
  const match = content.match(/\/\*\*\s*\n([^*]*(?:\*(?!\/)[^*]*)*)\*\//);
  return match ? match[1].replace(/\s*\*\s?/g, '\n').trim() : null;
}

function extractClasses(content: string): any[] {
  const classes: any[] = [];
  const classRegex = /(?:\/\*\*([\s\S]*?)\*\/)?\s*(?:export\s+)?class\s+(\w+)/g;

  let match;
  while ((match = classRegex.exec(content)) !== null) {
    const description = match[1] ? match[1].replace(/\s*\*\s?/g, '\n').trim() : '';
    const name = match[2];
    const methods = extractMethodsForClass(content, name);

    classes.push({ name, description, methods });
  }

  return classes;
}

function extractMethodsForClass(content: string, className: string): any[] {
  const methods: any[] = [];
  const methodRegex = /(?:\/\*\*([\s\S]*?)\*\/)?\s*(?:public|private|protected)?\s*(\w+)\s*\((.*?)\)(?:\s*:\s*(\w+))?/g;

  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    if (match[2] !== className && match[2] !== 'constructor') {
      const description = match[1] ? match[1].replace(/\s*\*\s?/g, '\n').trim() : '';
      const name = match[2];
      const params = match[3].split(',').map(p => p.trim()).filter(p => p);
      const returns = match[4] || 'void';

      methods.push({ name, description, params, returns });
    }
  }

  return methods;
}

function extractFunctions(content: string): any[] {
  const functions: any[] = [];
  const funcRegex = /(?:\/\*\*([\s\S]*?)\*\/)?\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\((.*?)\)(?:\s*:\s*(\w+))?/g;

  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const description = match[1] ? match[1].replace(/\s*\*\s?/g, '\n').trim() : '';
    const name = match[2];
    const params = match[3].split(',').map(p => p.trim()).filter(p => p);
    const returns = match[4] || 'void';

    functions.push({ name, description, params, returns });
  }

  return functions;
}

function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(directory: string) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }

  if (fs.existsSync(dir)) {
    walk(dir);
  }

  return files;
}
