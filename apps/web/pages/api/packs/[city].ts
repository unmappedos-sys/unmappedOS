import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { city } = req.query;

  if (typeof city !== 'string') {
    return res.status(400).json({ error: 'Invalid city parameter' });
  }

  const packPath = path.join(process.cwd(), 'public', 'data', 'packs', `${city}_pack.json`);

  if (!fs.existsSync(packPath)) {
    return res.status(404).json({ error: 'City pack not found' });
  }

  const packData = fs.readFileSync(packPath, 'utf-8');
  const pack = JSON.parse(packData);

  res.status(200).json(pack);
}
