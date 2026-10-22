// Pays du visiteur, déduit par Vercel de son adresse IP (utilisé pour le geopricing)
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({ country: req.headers['x-vercel-ip-country'] || null });
}
