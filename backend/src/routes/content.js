import express from 'express';
import {
  ensureFaqContent,
  ensureAboutContent,
  faqPublicPayload,
  aboutPublicPayload,
} from '../utils/siteContentService.js';

const router = express.Router();

router.get('/faq', async (_req, res) => {
  try {
    const doc = await ensureFaqContent();
    res.json(faqPublicPayload(doc));
  } catch (error) {
    console.error('GET /api/content/faq:', error);
    res.status(500).json({ message: 'FAQ კონტენტის მიღება ვერ მოხერხდა' });
  }
});

router.get('/about', async (_req, res) => {
  try {
    const doc = await ensureAboutContent();
    res.json(aboutPublicPayload(doc));
  } catch (error) {
    console.error('GET /api/content/about:', error);
    res.status(500).json({ message: 'About კონტენტის მიღება ვერ მოხერხდა' });
  }
});

export default router;
