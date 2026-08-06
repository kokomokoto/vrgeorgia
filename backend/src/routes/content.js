import express from 'express';
import {
  ensureFaqContent,
  ensureAboutContent,
  ensureHomeDesignContent,
  faqPublicPayload,
  aboutPublicPayload,
  homeDesignPublicPayload,
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

/** Homepage Design Mode layout — საჯარო (ყველა ვიზიტორი) */
router.get('/home-design', async (_req, res) => {
  try {
    const doc = await ensureHomeDesignContent();
    res.json(homeDesignPublicPayload(doc));
  } catch (error) {
    console.error('GET /api/content/home-design:', error);
    res.status(500).json({ message: 'მთავარი გვერდის დიზაინის მიღება ვერ მოხერხდა' });
  }
});

export default router;
