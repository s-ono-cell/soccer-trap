import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function createZip() {
  const zip = new JSZip();
  const distDir = path.resolve('dist');

  function addDirToZip(currentDir, zipFolder) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      if (file === 'netlify_dist.zip') continue;
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const subFolder = zipFolder.folder(file);
        addDirToZip(fullPath, subFolder);
      } else {
        const content = fs.readFileSync(fullPath);
        zipFolder.file(file, content);
      }
    }
  }

  // netlify.toml も含める
  if (fs.existsSync('netlify.toml')) {
    zip.file('netlify.toml', fs.readFileSync('netlify.toml'));
  }

  addDirToZip(distDir, zip);

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.mkdirSync('public', { recursive: true });
  fs.writeFileSync('public/netlify_dist.zip', buffer);
  fs.writeFileSync('dist/netlify_dist.zip', buffer);
  console.log('Successfully created public/netlify_dist.zip (size:', buffer.length, 'bytes)');
}

createZip().catch(console.error);
