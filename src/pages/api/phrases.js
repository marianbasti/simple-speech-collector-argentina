
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const filePath = path.resolve('./public', 'phrases.txt');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Failed to read phrases file' });
      return;
    }
    res.status(200).send(data);
  });
}