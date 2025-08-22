import sharp from "sharp";

// pomocná funkcia na „mozaiku“ (pixelate)
async function pixelate(buffer, block = 20) {
  const img = sharp(buffer);
  const { width, height } = await img.metadata();
  const w = Math.max(1, Math.round((width || 200) / block));
  const h = Math.max(1, Math.round((height || 200) / block));
  return sharp(buffer)
    .resize(w, h, { kernel: "nearest" })
    .resize(width, height, { kernel: "nearest" })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export default async function handler(req, res) {
  try {
    const { url, type = "blur", sigma = "20", block = "20", key } = req.query;

    // jednoduchá ochrana: API kľúč (pridaj ho vo Vercel → Settings → Environment Variables)
    if (process.env.API_KEY && key !== process.env.API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!url || !/^https?:\/\//.test(url)) {
      return res.status(400).json({ error: "Missing or invalid url" });
    }

    // stiahni originálny obrázok
    const rsp = await fetch(url);
    if (!rsp.ok) return res.status(400).json({ error: "Fetch failed" });
    const buf = Buffer.from(await rsp.arrayBuffer());

    let out;
    if (type === "pixelate") {
      out = await pixelate(buf, parseInt(block, 10));
    } else {
      // Gaussian blur
      out = await sharp(buf).blur(parseFloat(sigma)).jpeg({ quality: 90 }).toBuffer();
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
