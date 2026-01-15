const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../src/data/produtos.json');
const imagesDir = path.resolve(__dirname, '../public/pre_order_imagens');

const products = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const normalizeImageName = (value) => {
  if (!value || typeof value !== 'string') return null;
  return value.replace(/^\/?pre_order_imagens\//i, '').replace(/^\/+/, '');
};

const missing = [];

products.forEach((product) => {
  const references = new Set();
  if (product.imagem) {
    references.add(normalizeImageName(product.imagem));
  }
  if (Array.isArray(product.imagens)) {
    product.imagens.forEach((img) => references.add(normalizeImageName(img)));
  }

  references.forEach((file) => {
    if (!file) return;
    const filePath = path.join(imagesDir, file);
    if (!fs.existsSync(filePath)) {
      missing.push({ id: product.id, file });
    }
  });
});

if (missing.length) {
  console.error('Imagens ausentes:');
  missing.forEach(({ id, file }) => console.error(`- ${id}: ${file}`));
  process.exitCode = 1;
} else {
  console.log('Todas as imagens referenciadas existem em public/pre_order_imagens.');
}
