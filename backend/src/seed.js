import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { User } from './models/User.js';
import { Property } from './models/Property.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';

async function run() {
  await mongoose.connect(MONGODB_URI);

  await Property.deleteMany({});
  await User.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 12);
  const user = await User.create({ email: 'demo@vrgeorgia.local', passwordHash, phone: '+995 555 000 000' });

  await Property.create([
    {
      title: 'თბილისი • თანამედროვე ბინა',
      desc: 'სადემონსტრაციო განცხადება — თანამედროვე ბინა ქალაქის ცენტრში, კარგი ხედით და კომფორტული განლაგებით.',
      price: 120000,
      city: 'Tbilisi',
      region: 'Tbilisi',
      location: { lat: 41.7151, lng: 44.8271 },
      type: 'apartment',
      dealType: 'sale',
      photos: [],
      threeDLink: '',
      contact: { phone: '+995 555 000 000', email: 'demo@vrgeorgia.local' },
      userId: user._id
    },
    {
      title: 'ბათუმი • სახლი ქირით',
      desc: 'სადემონსტრაციო განცხადება — სახლი ბათუმში, ზღვის ახლოს. შესაძლებელია გრძელვადიანი ქირაობა.',
      price: 1200,
      city: 'Batumi',
      region: 'Adjara',
      location: { lat: 41.6168, lng: 41.6367 },
      type: 'house',
      dealType: 'rent',
      photos: [],
      threeDLink: 'https://example.com/embed-3d',
      contact: { phone: '+995 555 000 000', email: 'demo@vrgeorgia.local' },
      userId: user._id
    }
  ]);

  console.log('Seeded: demo@vrgeorgia.local / password123');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
